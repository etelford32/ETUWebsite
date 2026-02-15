"use client";

import { useEffect, useRef } from "react";
import * as THREE from 'three';

export type QualityLevel = "low" | "medium" | "high";

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
    wave: number;
    waveState: string;
    shieldHP: number;
    maxShieldHP: number;
    upgradeLevel: number;
  }) => void;
  onSceneReady?: (scene: any) => void;
}

export default function Megabot({
  quality = "medium",
  trackingTarget = null,
  buttonBounds = null,
  isButtonClicked = false,
  onLaserUpdate = undefined,
  onGameStateUpdate = undefined,
  onSceneReady = undefined
}: MegabotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const megabotRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Megabot scene with Three.js ES modules
    if (containerRef.current) {
      megabotRef.current = new MegabotScene(containerRef.current, quality, onLaserUpdate, onGameStateUpdate);
      if (onSceneReady) onSceneReady(megabotRef.current);
    }

    return () => {
      if (megabotRef.current && megabotRef.current.destroy) {
        megabotRef.current.destroy();
      }
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
  THREE: typeof THREE;
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
  cameraAngle: number = 0;      // Horizontal orbit angle for minigame camera
  cameraDistance: number = 1200; // Current distance (smoothed toward cameraTargetDistance)

  // Godmode 3D camera system
  cameraYaw: number = 0;              // Horizontal orbit angle (radians)
  cameraPitch: number = 0.35;          // Vertical orbit angle (0 = horizon, PI/2 = top-down)
  cameraTargetDistance: number = 1200; // Smooth zoom target
  cameraPanX: number = 0;             // Look-at pan offset X
  cameraPanY: number = 0;             // Look-at pan offset Y
  cameraPanZ: number = 0;             // Look-at pan offset Z
  private _isDragging = false;        // Right-click orbit drag active
  private _isPanning = false;         // Middle-click pan drag active
  private _dragStartX = 0;
  private _dragStartY = 0;
  private _dragTotalDist = 0;         // Total drag distance (for click vs drag detection)
  // Camera limits & tuning
  readonly CAMERA_MIN_DISTANCE = 200;
  readonly CAMERA_MAX_DISTANCE = 5000;
  readonly CAMERA_MIN_PITCH = -0.3;    // Slightly below horizon
  readonly CAMERA_MAX_PITCH = 1.45;    // Near top-down
  readonly CAMERA_ORBIT_SPEED = 0.004;
  readonly CAMERA_PAN_SPEED = 1.5;
  readonly CAMERA_ZOOM_SMOOTH = 0.08;  // Zoom interpolation factor

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
  enemyLasers: any[] = []; // Enemy laser beams
  explosions3D: any[] = []; // 3D explosion effects
  lastShipSpawnTime: number = 0;

  // Formation System
  formations: any[] = []; // Active formations
  lastFormationSpawnTime: number = 0;
  formationIdCounter: number = 0;
  readonly FORMATION_SPAWN_INTERVAL = 5000; // Spawn formation every 5 seconds
  readonly FORMATION_TYPES = ['v-formation', 'pincer', 'bomber-escort', 'orbit-strafe'] as const;

  // Game state
  gameScore: number = 0;
  megabotHealth: number = 10000;
  onGameStateUpdate?: (state: {
    score: number;
    health: number;
    shipCount: number;
    missileCount: number;
    wave: number;
    waveState: string;
    shieldHP: number;
    maxShieldHP: number;
    upgradeLevel: number;
  }) => void;

  // Game state callback dedup - only fire when values change
  private _prevScore = -1;
  private _prevHealth = -1;
  private _prevShipCount = -1;
  private _prevMissileCount = -1;
  private _prevWave = -1;
  private _prevWaveState = '';
  private _prevShieldHP = -1;
  private _prevUpgradeLevel = -1;

  // Performance: real delta time tracking
  lastFrameTime: number = 0;

  // Performance: pre-allocated reusable objects to reduce GC pressure
  private _tmpVec3A = new THREE.Vector3();
  private _tmpVec3B = new THREE.Vector3();
  private _tmpVec3C = new THREE.Vector3();
  private _tmpVec3D = new THREE.Vector3();
  private _tmpVec3E = new THREE.Vector3();
  private _tmpVec3F = new THREE.Vector3();
  private _tmpQuat = new THREE.Quaternion();
  private _tmpQuatB = new THREE.Quaternion();
  private _upVec = new THREE.Vector3(0, 1, 0); // constant up direction
  // Pre-allocated color constants for ship damage effects
  private _colorWhite = new THREE.Color(0xffffff);
  private _colorOrangeDmg = new THREE.Color(0xff9900);
  private _colorOrangeFlicker = new THREE.Color(0xff6600);
  private _colorRedDmg = new THREE.Color(0xff4400);
  // Reusable laser data object to avoid per-frame object literal allocations
  private _cachedLaserData = {
    leftStart: { x: 0, y: 0 }, leftEnd: { x: 0, y: 0 },
    rightStart: { x: 0, y: 0 }, rightEnd: { x: 0, y: 0 },
    visible: false
  };
  // Performance: cached raycaster objects for setTrackingTarget (avoids per-mousemove allocation)
  private _cachedRaycaster = new THREE.Raycaster();
  private _cachedMouse = new THREE.Vector2();
  private _cachedPlane = new THREE.Plane();
  private _cachedCameraDir = new THREE.Vector3();
  private _cachedTargetPos = new THREE.Vector3();
  private _cachedPlanePoint = new THREE.Vector3();
  private _cachedPlaneNormal = new THREE.Vector3();
  // Performance: burst queue replaces setTimeout in fireRapidBurst (prevents timer leaks)
  private _pendingBursts: { ship: any; fireTime: number }[] = [];
  // Performance: formation bomber index for O(1) escort->bomber lookup
  private _formationBomberIndex = new Map<number, any>();
  // Performance: cached border laser shader material (avoids recompilation on hover)
  private _borderLaserShaderMaterial: any = null;
  // Performance: squared distance threshold for particle respawn (avoids sqrt)
  private _particleRespawnDistSq = 1000 * 1000; // 1000^2
  private _particleContainDistSq = 0; // set in constructor based on MAIN_SIZE
  // Performance: object pool for explosion particle systems (avoids per-explosion allocation)
  private _explosionPool: any[] = [];
  private _explosionPoolInitialized = false;
  // Performance: shared geometry cache for ship types (avoids recreating identical geometries)
  private _geometryCache = new Map<string, any>();

  // Bound event handlers for proper cleanup
  private _boundMouseMove: ((e: MouseEvent) => void) | null = null;
  private _boundClick: ((e: MouseEvent) => void) | null = null;
  private _boundResize: (() => void) | null = null;
  private _boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _boundKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private _boundWheel: ((e: WheelEvent) => void) | null = null;
  private _boundMouseDown: ((e: MouseEvent) => void) | null = null;
  private _boundMouseUp: ((e: MouseEvent) => void) | null = null;
  private _boundContextMenu: ((e: Event) => void) | null = null;

  // City / Buildings system
  buildings: any[] = [];
  readonly BUILDING_COUNT = 60;
  readonly CITY_RADIUS = 1400; // How far buildings spread from center
  readonly CITY_INNER_RADIUS = 250; // Keep clear around megabot's feet

  // Megabot movement (WASD / arrow keys)
  keysPressed: Set<string> = new Set();
  megabotWorldPos = new THREE.Vector3(0, 0, 0); // Cached position updated per frame
  readonly MEGABOT_MOVE_SPEED = 250; // Units per second
  readonly MEGABOT_STOMP_RADIUS = 180; // Core destroy radius for Godzilla stomp
  readonly STOMP_HEAVY_RADIUS = 280; // Heavy splash damage radius
  readonly STOMP_LIGHT_RADIUS = 350; // Light splash damage radius

  // Ground & standing
  readonly GROUND_Y = -350 * 0.5; // Ground plane level (= -MAIN_SIZE * 0.5, matches building base)
  readonly MEGABOT_STAND_Y = 350 * 2.2; // Y position so feet touch ground level
  groundPlane: any = null;

  // Walk animation
  walkCycle: number = 0;
  isWalking: boolean = false;
  readonly STRIDE_ANGLE = 0.35; // Leg swing amplitude (radians)
  readonly ARM_SWING_ANGLE = 0.25; // Arm swing amplitude
  readonly WALK_BOB_HEIGHT = 18; // Vertical bob during walk
  readonly WALK_CYCLE_SPEED = 5; // Walk cycle frequency multiplier
  readonly MEGABOT_ROTATE_SPEED = 2.5; // Q/E rotation speed (radians/sec)

  // Camera shake system
  cameraShakeX: number = 0;
  cameraShakeY: number = 0;
  cameraShakeZ: number = 0;
  cameraShakeMagnitude: number = 0;
  cameraShakeDecay: number = 0;

  // Building damage smoke/fire particle pool
  buildingSmokeEmitters: any[] = [];
  readonly MAX_SMOKE_EMITTERS = 10;
  readonly SMOKE_PARTICLES_PER_EMITTER = 15;

  // Debris chunk pool
  debrisChunks: any[] = [];
  readonly MAX_DEBRIS_CHUNKS = 40;
  debrisPoolInitialized: boolean = false;

  // Collapsing buildings (animated destruction)
  collapsingBuildings: any[] = [];

  // Wave system
  currentWave: number = 0;
  waveState: 'intermission' | 'active' | 'boss' = 'intermission';
  waveTimer: number = 0;
  waveShipsRemaining: number = 0; // Ships left to spawn this wave
  waveShipsAlive: number = 0; // Ships currently alive from this wave
  readonly WAVE_INTERMISSION_TIME = 4; // seconds between waves
  readonly BOSS_WAVE_INTERVAL = 5; // Boss every 5th wave

  // Shield system
  shieldHP: number = 3000;
  readonly MAX_SHIELD_HP = 3000;
  readonly SHIELD_RECHARGE_DELAY = 3; // seconds after last hit before recharge
  readonly SHIELD_RECHARGE_RATE = 400; // HP per second
  lastDamageTime: number = 0;
  shieldMesh: any = null; // Visual shield bubble

  // Weapon upgrade system
  upgradeLevel: number = 0;
  readonly UPGRADE_THRESHOLDS = [1000, 3000, 6000, 10000];
  // Level 1: Homing missiles
  // Level 2: Wider laser beam
  // Level 3: Missile barrage ability (Q key)
  // Level 4: All weapons enhanced
  barrageCooldown: number = 0;
  readonly BARRAGE_COOLDOWN_TIME = 8; // seconds

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
  readonly MAX_ENEMY_LASERS = 30;
  readonly MAX_EXPLOSIONS_3D = 30;
  readonly SHIP_SPAWN_INTERVAL = 2000; // ms
  readonly SHIP_SPEED_MIN = 200;
  readonly SHIP_SPEED_MAX = 400;
  readonly MISSILE_SPEED_3D = 800;
  readonly ENEMY_LASER_SPEED = 1200;
  readonly ENEMY_LASER_RANGE = 1200;
  readonly SHIP_SPAWN_RADIUS = 1800; // Distance from megabot where ships spawn
  readonly _despawnRadiusSq = (1800 * 2) ** 2; // SHIP_SPAWN_RADIUS * 2, pre-squared for distance checks

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
      wave: number;
      waveState: string;
      shieldHP: number;
      maxShieldHP: number;
      upgradeLevel: number;
    }) => void
  ) {
    this.THREE = THREE;
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

    this._particleContainDistSq = (this.MAIN_SIZE * 0.5) * (this.MAIN_SIZE * 0.5);
    this.init();
    this._initExplosionPool();
    this.createStarField();
    this.createGroundPlane();
    this.createMainMegabot();
    this.createCity();
    this.initSmokeEmitters();
    this.createShieldBubble();
    this.createSatellites();
    this.createEnergyParticles();
    this.addEventListeners();
    this.animate();
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

    // Preserve camera state across quality change
    const savedCamera = {
      yaw: this.cameraYaw,
      pitch: this.cameraPitch,
      distance: this.cameraDistance,
      targetDistance: this.cameraTargetDistance,
      panX: this.cameraPanX,
      panY: this.cameraPanY,
      panZ: this.cameraPanZ,
    };

    this.destroy();
    this.settings = this.detectCapabilities(quality);

    if (!this.isWebGLAvailable()) {
      this.showFallback();
      return;
    }

    try {
      this.init();
      this._initExplosionPool();
      this.createStarField();
      this.createGroundPlane();
      this.createMainMegabot();
      this.createCity();
      this.initSmokeEmitters();
      this.createShieldBubble();
      this.createSatellites();
      this.createEnergyParticles();
      this.addEventListeners();

      // Restore camera state
      this.cameraYaw = savedCamera.yaw;
      this.cameraPitch = savedCamera.pitch;
      this.cameraDistance = savedCamera.distance;
      this.cameraTargetDistance = savedCamera.targetDistance;
      this.cameraPanX = savedCamera.panX;
      this.cameraPanY = savedCamera.panY;
      this.cameraPanZ = savedCamera.panZ;

      this.animate();
    } catch (error) {
      console.error("❌ Error recreating scene:", error);
      this.showFallback();
    }
  }

  setTrackingTarget(target: { x: number; y: number } | null) {
    const THREE = this.THREE;
    if (!THREE) return;

    this.trackingTarget = target;

    if (target && this.camera && this.headGroup) {
      // Convert 2D screen coordinates to 3D position using cached raycaster (zero allocation)
      this._cachedMouse.x = (target.x / window.innerWidth) * 2 - 1;
      this._cachedMouse.y = -(target.y / window.innerHeight) * 2 + 1;

      this._cachedRaycaster.setFromCamera(this._cachedMouse, this.camera);

      // Project onto a plane in front of the camera at a reasonable UI depth
      this.camera.getWorldDirection(this._cachedCameraDir);

      // Scale plane distance with camera distance so laser targeting stays accurate at all zoom levels
      const planeDistance = Math.max(400, this.cameraDistance * 0.6);
      this._cachedPlanePoint.copy(this.camera.position).addScaledVector(this._cachedCameraDir, planeDistance);
      this._cachedPlaneNormal.copy(this._cachedCameraDir).negate();
      this._cachedPlane.setFromNormalAndCoplanarPoint(this._cachedPlaneNormal, this._cachedPlanePoint);

      // Intersect ray with plane
      const intersection = this._cachedRaycaster.ray.intersectPlane(this._cachedPlane, this._cachedTargetPos);

      if (intersection) {
        this.targetPosition3D = this._cachedTargetPos;

        // Calculate proper head and body rotation to look at the target (zero allocation)
        this.mainMegabot.getWorldPosition(this._tmpVec3A);

        // Calculate direction from megabot to target
        const directionToTarget = this._tmpVec3B.subVectors(this._cachedTargetPos, this._tmpVec3A);

        // Calculate rotation angles (Euler angles in Y-X-Z order)
        // Y-axis rotation (yaw - horizontal turn)
        const targetYaw = Math.atan2(directionToTarget.x, directionToTarget.z);

        // X-axis rotation (pitch - vertical tilt)
        const horizontalDistance = Math.sqrt(directionToTarget.x * directionToTarget.x + directionToTarget.z * directionToTarget.z);
        const targetPitch = -Math.atan2(directionToTarget.y, horizontalDistance);

        // Store target rotations (limited for natural movement)
        this.targetRotation.y = THREE.MathUtils.clamp(targetYaw, -0.5, 0.5); // Limit horizontal turn
        this.targetRotation.x = THREE.MathUtils.clamp(targetPitch, -0.3, 0.3); // Limit vertical tilt
      } else {
        this.targetPosition3D = null;
        this.targetRotation.x = 0;
        this.targetRotation.y = 0;
      }
    } else {
      // Return to neutral position
      this.targetRotation.x = 0;
      this.targetRotation.y = 0;
      this.targetPosition3D = null;
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
    const THREE = this.THREE;
    if (!THREE || !this.buttonBounds || !this.scene) return;

    // Clear existing border lasers
    this.clearBorderLasers();

    // Create laser beams that trace the button border
    // Reuse cached shader material to avoid GPU recompilation on each hover
    if (!this._borderLaserShaderMaterial) {
      this._borderLaserShaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          scanProgress: { value: 0 },
          beamColor: { value: new THREE.Color(1.0, 0.1, 0.1) },
          intensity: { value: 4.0 },
        },
        vertexShader: `
          varying vec2 vUv;

          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform float scanProgress;
          uniform vec3 beamColor;
          uniform float intensity;
          varying vec2 vUv;

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
    }
    // Reset uniforms for this scan
    const laserMaterial = this._borderLaserShaderMaterial;
    laserMaterial.uniforms.time.value = 0;
    laserMaterial.uniforms.scanProgress.value = 0;

    // Store material for cleanup
    this.borderLasers.push({ material: laserMaterial, meshes: [] });
  }

  clearBorderLasers() {
    this.borderLasers.forEach(laser => {
      // Don't dispose the cached shader material - it's reused across hovers
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
    const THREE = this.THREE;
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
    const THREE = this.THREE;
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
    const THREE = this.THREE;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0001);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.offsetWidth / this.container.offsetHeight,
      1,
      12000 // Extended for godmode camera max zoom-out
    );
    // Position camera to frame the grounded megabot and city
    const initLookY = this.GROUND_Y + (this.MEGABOT_STAND_Y - this.GROUND_Y) * 0.45;
    this.camera.position.set(0, initLookY + 350, this.cameraDistance);
    this.camera.lookAt(0, initLookY, 0);

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
    const THREE = this.THREE;
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
    const THREE = this.THREE;
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
        varying vec3 vViewPosition;
        varying vec2 vUv;

        void main() {
          vNormal = normalize(normalMatrix * normal);
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

    // Position megabot so feet touch the ground plane
    this.mainMegabot.position.y = this.MEGABOT_STAND_Y;

    this.scene.add(this.mainMegabot);
    console.log("🤖 Gundam-style Megabot created with evil laser eyes!");
  }

  // Create the ground plane the city and megabot stand on
  createGroundPlane() {
    const THREE = this.THREE;
    const size = 8000; // Large enough to extend past expanded city radius

    // Dark cyberpunk ground surface
    const groundGeo = new THREE.PlaneGeometry(size, size);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a14,
      metalness: 0.4,
      roughness: 0.7,
      emissive: new THREE.Color(0x050510),
      emissiveIntensity: 0.3,
    });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = this.GROUND_Y;
    this.scene.add(this.groundPlane);

    // Subtle tech grid overlay
    const gridHelper = new THREE.GridHelper(size, 80, 0x0a2240, 0x061228);
    gridHelper.position.y = this.GROUND_Y + 0.5;
    this.scene.add(gridHelper);

    // Ambient ground glow ring around city center
    const ringGeo = new THREE.RingGeometry(this.CITY_INNER_RADIUS - 20, this.CITY_INNER_RADIUS + 5, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x003366,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = this.GROUND_Y + 1;
    this.scene.add(ring);
  }

  // Create a destructible cityscape around Megabot's feet
  createCity() {
    const THREE = this.THREE;
    this.buildings = [];

    // Building color palettes - cyberpunk neon city
    const buildingColors = [
      { base: 0x1a1a2e, accent: 0x00d4ff, window: 0x00aaff },
      { base: 0x16213e, accent: 0xff6b9d, window: 0xff4488 },
      { base: 0x0f3460, accent: 0x53d769, window: 0x33ff66 },
      { base: 0x1a1a3e, accent: 0xffa500, window: 0xffcc00 },
      { base: 0x2d132c, accent: 0xe94560, window: 0xff2244 },
      { base: 0x222244, accent: 0xaa66ff, window: 0x8844dd },
    ];

    for (let i = 0; i < this.BUILDING_COUNT; i++) {
      // Place buildings in a ring around megabot
      const angle = (i / this.BUILDING_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const radius = this.CITY_INNER_RADIUS + Math.random() * (this.CITY_RADIUS - this.CITY_INNER_RADIUS);

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Vary building dimensions — taller near center, shorter at edges
      const distRatio = (radius - this.CITY_INNER_RADIUS) / (this.CITY_RADIUS - this.CITY_INNER_RADIUS);
      const heightScale = 1.0 - distRatio * 0.5; // Outer buildings are ~50% shorter
      const width = 50 + Math.random() * 70;
      const depth = 50 + Math.random() * 70;
      const height = (150 + Math.random() * 400) * heightScale;

      const palette = buildingColors[Math.floor(Math.random() * buildingColors.length)];
      const group = new THREE.Group();

      // Main building body
      const bodyGeo = new THREE.BoxGeometry(width, height, depth);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: palette.base,
        metalness: 0.7,
        roughness: 0.3,
        emissive: new THREE.Color(palette.base),
        emissiveIntensity: 0.1,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = height / 2;
      group.add(body);

      // Window rows - glowing strips on the front faces
      const windowRows = Math.floor(height / 20);
      const windowMat = new THREE.MeshBasicMaterial({
        color: palette.window,
        transparent: true,
        opacity: 0.6 + Math.random() * 0.3,
      });

      for (let row = 0; row < windowRows; row++) {
        // Only add windows to ~60% of rows (some are dark floors)
        if (Math.random() > 0.6) continue;

        const windowHeight = 4;
        const windowWidth = width * 0.8;
        const windowGeo = new THREE.BoxGeometry(windowWidth, windowHeight, 0.5);

        // Front face windows
        const windowFront = new THREE.Mesh(windowGeo, windowMat);
        windowFront.position.set(0, 10 + row * 20, depth / 2 + 0.3);
        group.add(windowFront);

        // Back face windows
        const windowBack = new THREE.Mesh(windowGeo, windowMat);
        windowBack.position.set(0, 10 + row * 20, -depth / 2 - 0.3);
        group.add(windowBack);

        // Side windows
        const sideWindowGeo = new THREE.BoxGeometry(0.5, windowHeight, depth * 0.8);
        const windowLeft = new THREE.Mesh(sideWindowGeo, windowMat);
        windowLeft.position.set(-width / 2 - 0.3, 10 + row * 20, 0);
        group.add(windowLeft);

        const windowRight = new THREE.Mesh(sideWindowGeo, windowMat);
        windowRight.position.set(width / 2 + 0.3, 10 + row * 20, 0);
        group.add(windowRight);
      }

      // Rooftop accent light
      const accentGeo = new THREE.BoxGeometry(width * 0.3, 3, depth * 0.3);
      const accentMat = new THREE.MeshBasicMaterial({
        color: palette.accent,
        transparent: true,
        opacity: 0.8,
      });
      const accent = new THREE.Mesh(accentGeo, accentMat);
      accent.position.y = height + 1.5;
      group.add(accent);

      // Rooftop antenna/spire on taller buildings (height > 400 limits lights to ~15)
      if (height > 400) {
        const spireGeo = new THREE.CylinderGeometry(1, 2, 40, 6);
        const spireMat = new THREE.MeshStandardMaterial({
          color: 0x444466,
          metalness: 0.9,
          roughness: 0.1,
        });
        const spire = new THREE.Mesh(spireGeo, spireMat);
        spire.position.y = height + 20;
        group.add(spire);

        // Blinking light on top — only on tall buildings to limit light count
        const blinkLight = new THREE.PointLight(palette.accent, 2, 80);
        blinkLight.position.y = height + 42;
        group.add(blinkLight);
      }

      // Emissive base glow strip instead of PointLight (saves 36 lights for performance)
      const baseGlowGeo = new THREE.BoxGeometry(width * 0.9, 3, depth * 0.9);
      const baseGlowMat = new THREE.MeshBasicMaterial({
        color: palette.accent,
        transparent: true,
        opacity: 0.4,
      });
      const baseGlow = new THREE.Mesh(baseGlowGeo, baseGlowMat);
      baseGlow.position.y = 1.5;
      group.add(baseGlow);

      group.position.set(x, -this.MAIN_SIZE * 0.5, z);

      this.scene.add(group);

      this.buildings.push({
        group,
        health: Math.ceil(height / 30), // Taller buildings take more hits
        maxHealth: Math.ceil(height / 30),
        width,
        height,
        depth,
        active: true,
        palette,
        damageLevel: 0, // 0 = pristine, increases with damage
        // Damage effect state
        damageTiltX: (Math.random() - 0.5) * 0.3, // Random lean direction on damage
        damageTiltZ: (Math.random() - 0.5) * 0.3,
        smokeEmitterIndex: -1, // Index into buildingSmokeEmitters pool (-1 = none)
        windowMeshes: group.children.filter((c: any) => c.material === windowMat),
      });
    }
  }

  // Update buildings - check for damage from ship crashes and enemy fire
  updateBuildings(dt: number) {
    const THREE = this.THREE;

    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const building = this.buildings[i];
      if (!building.active) continue;

      const buildingWorldPos = building.group.position;

      // Check collision with enemy ships that crash into buildings
      for (let j = this.enemyShips.length - 1; j >= 0; j--) {
        const ship = this.enemyShips[j];
        if (!ship.active) continue;

        const dx = ship.group.position.x - buildingWorldPos.x;
        const dz = ship.group.position.z - buildingWorldPos.z;
        const horizontalDistSq = dx * dx + dz * dz;
        const shipY = ship.group.position.y;
        const buildingTop = buildingWorldPos.y + building.height;
        const collisionRadius = building.width / 2 + ship.size;

        if (horizontalDistSq < collisionRadius * collisionRadius &&
            shipY > buildingWorldPos.y && shipY < buildingTop) {
          // Ship crashed into building!
          building.health--;
          building.damageLevel++;

          this.create3DExplosion(ship.group.position, ship.size * 1.5);

          // Destroy the ship on impact
          this.scene.remove(ship.group);
          this.enemyShips.splice(j, 1);

          if (building.health <= 0) {
            this.destroyBuilding(building, i);
            break;
          } else {
            this.applyBuildingDamageVisuals(building);
          }
        }
      }

      if (!building.active) continue;

      // Check if enemy lasers/plasma hit buildings
      const laserCollisionRadius = building.width / 2 + 10;
      const laserCollisionRadiusSq = laserCollisionRadius * laserCollisionRadius;
      for (let j = this.enemyLasers.length - 1; j >= 0; j--) {
        const laser = this.enemyLasers[j];
        if (!laser.active) continue;

        const dx = laser.group.position.x - buildingWorldPos.x;
        const dz = laser.group.position.z - buildingWorldPos.z;
        const horizontalDistSq = dx * dx + dz * dz;
        const laserY = laser.group.position.y;

        if (horizontalDistSq < laserCollisionRadiusSq &&
            laserY > buildingWorldPos.y && laserY < buildingWorldPos.y + building.height) {
          // Laser hit building - only plasma does real damage
          if (laser.type === 'plasma') {
            building.health--;
            building.damageLevel++;
          }

          this.create3DExplosion(laser.group.position, 10);
          this.scene.remove(laser.group);
          this.enemyLasers.splice(j, 1);

          if (building.health <= 0) {
            this.destroyBuilding(building, i);
            break;
          } else {
            this.applyBuildingDamageVisuals(building);
          }
        }
      }
    }
  }

  // Destroy a building with collapse animation
  destroyBuilding(building: any, index: number) {
    const THREE = this.THREE;

    // Big explosion at building center (reuse temp vector)
    this._tmpVec3A.copy(building.group.position);
    this._tmpVec3A.y += building.height / 2;
    this.create3DExplosion(this._tmpVec3A, building.width * 1.5);

    // Release smoke emitter if assigned
    if (building.smokeEmitterIndex >= 0) {
      this.releaseSmokeEmitter(building.smokeEmitterIndex);
      building.smokeEmitterIndex = -1;
    }

    // Start collapse animation instead of instant removal
    building.active = false;
    this.collapsingBuildings.push({
      group: building.group,
      width: building.width,
      height: building.height,
      depth: building.depth,
      palette: building.palette,
      collapseTime: 0,
      collapseMaxTime: 0.8,
      collapseVelocityY: 0,
      collapseTiltX: (Math.random() - 0.5) * 0.4,
      collapseTiltZ: (Math.random() - 0.5) * 0.4,
      debrisSpawned: false,
    });

    // Camera shake for big destruction
    this.triggerCameraShake(8);

    // Score bonus for buildings being destroyed
    this.gameScore += 50;
  }

  // Update collapsing buildings animation
  updateCollapsingBuildings(dt: number) {
    const THREE = this.THREE;

    for (let i = this.collapsingBuildings.length - 1; i >= 0; i--) {
      const cb = this.collapsingBuildings[i];
      cb.collapseTime += dt;

      // Accelerate downward + tilt
      cb.collapseVelocityY -= 400 * dt; // gravity
      cb.group.position.y += cb.collapseVelocityY * dt;

      // Progressive tilt as it collapses
      const tiltProgress = Math.min(cb.collapseTime / cb.collapseMaxTime, 1.0);
      cb.group.rotation.x += cb.collapseTiltX * dt * 2;
      cb.group.rotation.z += cb.collapseTiltZ * dt * 2;

      // Shrink vertically (crumbling)
      cb.group.scale.y = Math.max(0, 1 - tiltProgress * 0.6);
      cb.group.scale.x = 1 + tiltProgress * 0.3; // Spread out horizontally
      cb.group.scale.z = 1 + tiltProgress * 0.3;

      // Spawn debris chunks at halfway point
      if (!cb.debrisSpawned && cb.collapseTime > cb.collapseMaxTime * 0.4) {
        cb.debrisSpawned = true;
        this.spawnDebrisChunks(cb.group.position, cb.width, cb.height, cb.depth, cb.palette);
      }

      // Remove when collapse is complete
      if (cb.collapseTime >= cb.collapseMaxTime) {
        // Final dust puff at ground level (reuse temp vector)
        this._tmpVec3B.copy(cb.group.position);
        this._tmpVec3B.y = this.GROUND_Y + 5;
        this.create3DExplosion(this._tmpVec3B, cb.width * 0.8);

        this.scene.remove(cb.group);
        this.collapsingBuildings.splice(i, 1);
      }
    }
  }

  // Spawn 3D debris chunks from a destroyed building
  spawnDebrisChunks(position: any, width: number, height: number, depth: number, palette: any) {
    const THREE = this.THREE;
    const chunkCount = 8;

    for (let i = 0; i < chunkCount; i++) {
      // Reuse from pool or create new
      let chunk: any;
      const inactive = this.debrisChunks.find((c: any) => !c.active);
      if (inactive) {
        chunk = inactive;
        chunk.active = true;
        chunk.lifetime = 0;
      } else if (this.debrisChunks.length < this.MAX_DEBRIS_CHUNKS) {
        const size = 5 + Math.random() * 15;
        const geo = new THREE.BoxGeometry(size, size * (0.5 + Math.random()), size);
        const mat = new THREE.MeshStandardMaterial({
          color: palette.base,
          metalness: 0.5,
          roughness: 0.6,
        });
        const mesh = new THREE.Mesh(geo, mat);
        chunk = { mesh, active: true, lifetime: 0, velocity: new THREE.Vector3(), rotSpeed: new THREE.Vector3() };
        this.debrisChunks.push(chunk);
      } else {
        // Pool full, skip
        continue;
      }

      // Position around building
      chunk.mesh.position.set(
        position.x + (Math.random() - 0.5) * width,
        position.y + Math.random() * height * 0.5,
        position.z + (Math.random() - 0.5) * depth
      );

      // Velocity: outward + upward
      chunk.velocity.set(
        (Math.random() - 0.5) * 250,
        100 + Math.random() * 200,
        (Math.random() - 0.5) * 250
      );

      // Random tumble
      chunk.rotSpeed.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );

      chunk.mesh.material.color.setHex(palette.base);
      chunk.mesh.material.opacity = 1.0;
      chunk.mesh.visible = true;
      this.scene.add(chunk.mesh);
    }
  }

  // Update debris chunks with gravity and fade
  updateDebrisChunks(dt: number) {
    for (const chunk of this.debrisChunks) {
      if (!chunk.active) continue;

      chunk.lifetime += dt;

      // Gravity
      chunk.velocity.y -= 400 * dt;

      // Move
      chunk.mesh.position.x += chunk.velocity.x * dt;
      chunk.mesh.position.y += chunk.velocity.y * dt;
      chunk.mesh.position.z += chunk.velocity.z * dt;

      // Tumble
      chunk.mesh.rotation.x += chunk.rotSpeed.x * dt;
      chunk.mesh.rotation.y += chunk.rotSpeed.y * dt;
      chunk.mesh.rotation.z += chunk.rotSpeed.z * dt;

      // Stop at ground
      if (chunk.mesh.position.y < this.GROUND_Y) {
        chunk.mesh.position.y = this.GROUND_Y;
        chunk.velocity.y *= -0.3; // Bounce
        chunk.velocity.x *= 0.7;
        chunk.velocity.z *= 0.7;
      }

      // Fade after 1s
      if (chunk.lifetime > 1.0) {
        const fadeProgress = (chunk.lifetime - 1.0) / 0.5;
        chunk.mesh.material.transparent = true;
        chunk.mesh.material.opacity = Math.max(0, 1 - fadeProgress);
      }

      // Remove after 1.5s
      if (chunk.lifetime > 1.5) {
        chunk.active = false;
        chunk.mesh.visible = false;
        this.scene.remove(chunk.mesh);
      }
    }
  }

  // Smoke/fire emitter pool management
  initSmokeEmitters() {
    const THREE = this.THREE;
    for (let i = 0; i < this.MAX_SMOKE_EMITTERS; i++) {
      const count = this.SMOKE_PARTICLES_PER_EMITTER;
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const velocities: number[][] = [];
      const lifetimes: number[] = [];

      for (let j = 0; j < count; j++) {
        positions[j * 3] = 0;
        positions[j * 3 + 1] = 0;
        positions[j * 3 + 2] = 0;
        velocities.push([(Math.random() - 0.5) * 15, 30 + Math.random() * 40, (Math.random() - 0.5) * 15]);
        lifetimes.push(Math.random() * 2); // Stagger initial lifetimes
      }

      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x444444,
        size: 10,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      });
      const system = new THREE.Points(geo, mat);
      system.visible = false;

      this.buildingSmokeEmitters.push({
        system,
        velocities,
        lifetimes,
        active: false,
        buildingRef: null,
        origin: new THREE.Vector3(),
      });

      this.scene.add(system);
    }
  }

  // Assign a smoke emitter to a damaged building
  assignSmokeEmitter(building: any) {
    for (let i = 0; i < this.buildingSmokeEmitters.length; i++) {
      const emitter = this.buildingSmokeEmitters[i];
      if (!emitter.active) {
        emitter.active = true;
        emitter.buildingRef = building;
        emitter.origin.copy(building.group.position);
        emitter.origin.y += building.height * 0.7; // Smoke from upper section
        emitter.system.visible = true;
        building.smokeEmitterIndex = i;

        // Set damage-based color: orange for heavy damage, gray for light
        const damageRatio = building.damageLevel / building.maxHealth;
        if (damageRatio > 0.7) {
          emitter.system.material.color.setHex(0xff6600); // Fire
          emitter.system.material.size = 12;
        } else {
          emitter.system.material.color.setHex(0x444444); // Smoke
          emitter.system.material.size = 10;
        }
        return;
      }
    }
  }

  // Release a smoke emitter back to the pool
  releaseSmokeEmitter(index: number) {
    if (index >= 0 && index < this.buildingSmokeEmitters.length) {
      const emitter = this.buildingSmokeEmitters[index];
      emitter.active = false;
      emitter.buildingRef = null;
      emitter.system.visible = false;
    }
  }

  // Update all active smoke emitters
  updateSmokeEmitters(dt: number) {
    for (const emitter of this.buildingSmokeEmitters) {
      if (!emitter.active) continue;

      const positions = emitter.system.geometry.attributes.position.array as Float32Array;
      const count = positions.length / 3;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        emitter.lifetimes[i] += dt;

        // Move particles
        positions[i3] += emitter.velocities[i][0] * dt;
        positions[i3 + 1] += emitter.velocities[i][1] * dt;
        positions[i3 + 2] += emitter.velocities[i][2] * dt;

        // Add slight drift
        emitter.velocities[i][0] += (Math.random() - 0.5) * 5 * dt;
        emitter.velocities[i][2] += (Math.random() - 0.5) * 5 * dt;

        // Respawn when lifetime exceeded
        if (emitter.lifetimes[i] > 2.0) {
          emitter.lifetimes[i] = 0;
          positions[i3] = emitter.origin.x + (Math.random() - 0.5) * 20;
          positions[i3 + 1] = emitter.origin.y + Math.random() * 10;
          positions[i3 + 2] = emitter.origin.z + (Math.random() - 0.5) * 20;
          emitter.velocities[i][0] = (Math.random() - 0.5) * 15;
          emitter.velocities[i][1] = 30 + Math.random() * 40;
          emitter.velocities[i][2] = (Math.random() - 0.5) * 15;
        }
      }

      emitter.system.geometry.attributes.position.needsUpdate = true;
    }
  }

  createSatellites() {
    const THREE = this.THREE;
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
    const THREE = this.THREE;
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

  // Performance: cache and reuse identical geometries across ship instances
  private _getCachedGeometry(key: string, factory: () => any): any {
    let geo = this._geometryCache.get(key);
    if (!geo) {
      geo = factory();
      this._geometryCache.set(key, geo);
    }
    return geo;
  }

  // Create 3D ship geometry with detailed mesh designs
  create3DShipGeometry(type: 'fighter' | 'bomber' | 'interceptor' | 'cruiser') {
    const THREE = this.THREE;
    const group = new THREE.Group();

    let size = 80, health = 1, color = 0xff4444;
    switch (type) {
      case 'fighter':
        size = 80;
        health = 1;
        color = 0xff4444;
        this.createFighterMesh(group, size, color, THREE);
        break;
      case 'bomber':
        size = 130;
        health = 3;
        color = 0xff8800;
        this.createBomberMesh(group, size, color, THREE);
        break;
      case 'interceptor':
        size = 100;
        health = 2;
        color = 0xffff00;
        this.createInterceptorMesh(group, size, color, THREE);
        break;
      case 'cruiser':
        size = 200;
        health = 8;
        color = 0xcc00ff;
        this.createCruiserMesh(group, size, color, THREE);
        break;
    }

    // Add point light for ship glow - increased intensity for better visibility
    const shipLight = new THREE.PointLight(color, 8, size * 6);
    shipLight.position.set(0, 0, 0);
    group.add(shipLight);

    // Performance: cache engine glow children to avoid forEach scanning every frame
    const engineColors = new Set([0x00ffff, 0xff6600, 0xffff00, 0xcc00ff]);
    const engineChildren: any[] = [];
    const emissiveChildren: any[] = [];
    group.children.forEach((child: any) => {
      if (child.material) {
        if (child.material.transparent && child.material.color) {
          const colorHex = child.material.color.getHex();
          if (engineColors.has(colorHex)) {
            engineChildren.push(child);
          }
        }
        if (child.material.emissiveIntensity !== undefined) {
          emissiveChildren.push(child);
        }
      }
    });

    return { group, size, health, maxHealth: health, type, hitFlash: 0, _engineChildren: engineChildren, _emissiveChildren: emissiveChildren };
  }

  // FIGHTER - Ultra-sleek stealth-fighter inspired design
  createFighterMesh(group: any, size: number, color: number, THREE: any) {
    // Sleek metallic materials with high polish
    const primaryMaterial = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 1.0,
      roughness: 0.1,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.3,
    });

    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 1.0,
      roughness: 0.05,
    });

    // Main fuselage - elongated diamond shape (shared geometry across all fighters)
    const fuselageGeometry = this._getCachedGeometry('fighter_fuselage', () => new THREE.CylinderGeometry(size * 0.12, size * 0.08, size * 1.8, 12));
    const fuselage = new THREE.Mesh(fuselageGeometry, primaryMaterial);
    fuselage.rotation.x = Math.PI / 2;
    group.add(fuselage);

    // Sharp nose cone
    const noseGeometry = this._getCachedGeometry('fighter_nose', () => new THREE.ConeGeometry(size * 0.12, size * 0.5, 12));
    const nose = new THREE.Mesh(noseGeometry, darkMaterial);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = size * 1.15;
    group.add(nose);

    // Sleek cockpit canopy (elongated teardrop)
    const cockpitGeometry = this._getCachedGeometry('fighter_cockpit', () => new THREE.SphereGeometry(size * 0.15, 16, 16));
    const cockpitMaterial = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      metalness: 0.2,
      roughness: 0.05,
      transparent: true,
      opacity: 0.8,
      emissive: new THREE.Color(0x00aaff),
      emissiveIntensity: 0.6,
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.z = size * 0.5;
    cockpit.scale.set(1, 0.5, 1.5);
    group.add(cockpit);

    // Razor-thin wings (stealth design)
    const wingGeometry = new THREE.BoxGeometry(size * 1.2, size * 0.04, size * 0.5);
    for (let side = -1; side <= 1; side += 2) {
      const wing = new THREE.Mesh(wingGeometry, primaryMaterial);
      wing.position.set(side * size * 0.6, 0, 0);
      wing.rotation.y = side * 0.15;
      group.add(wing);

      // Wing edge lights (neon strips)
      const edgeLightGeometry = new THREE.BoxGeometry(size * 1.2, size * 0.02, size * 0.02);
      const edgeLightMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.9,
      });
      const edgeLight = new THREE.Mesh(edgeLightGeometry, edgeLightMaterial);
      edgeLight.position.set(side * size * 0.6, 0, -size * 0.25);
      edgeLight.rotation.y = side * 0.15;
      group.add(edgeLight);
    }

    // Twin engine nacelles (compact and sleek)
    for (let side = -1; side <= 1; side += 2) {
      const nacelleGeometry = new THREE.CylinderGeometry(size * 0.1, size * 0.12, size * 0.6, 12);
      const nacelle = new THREE.Mesh(nacelleGeometry, darkMaterial);
      nacelle.rotation.x = Math.PI / 2;
      nacelle.position.set(side * size * 0.25, 0, -size * 0.4);
      group.add(nacelle);

      // Beautiful thruster glow (cyan/blue plasma effect)
      const thrusterGlowGeometry = new THREE.CylinderGeometry(size * 0.1, size * 0.15, size * 0.3, 12);
      const thrusterGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.95,
      });
      const thrusterGlow = new THREE.Mesh(thrusterGlowGeometry, thrusterGlowMaterial);
      thrusterGlow.rotation.x = Math.PI / 2;
      thrusterGlow.position.set(side * size * 0.25, 0, -size * 0.85);
      group.add(thrusterGlow);

      // Thruster outer glow (volumetric effect)
      const outerGlowGeometry = new THREE.CylinderGeometry(size * 0.15, size * 0.25, size * 0.4, 12);
      const outerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0x0088ff,
        transparent: true,
        opacity: 0.4,
      });
      const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
      outerGlow.rotation.x = Math.PI / 2;
      outerGlow.position.set(side * size * 0.25, 0, -size * 1.0);
      group.add(outerGlow);

      // Thruster point light for illumination
      const thrusterLight = new THREE.PointLight(0x00ffff, 4, size * 2);
      thrusterLight.position.set(side * size * 0.25, 0, -size * 0.85);
      group.add(thrusterLight);
    }

    // Sleek laser cannons (integrated into wings)
    for (let side = -1; side <= 1; side += 2) {
      const weaponGeometry = new THREE.CylinderGeometry(size * 0.03, size * 0.03, size * 0.4, 8);
      const weapon = new THREE.Mesh(weaponGeometry, darkMaterial);
      weapon.rotation.x = Math.PI / 2;
      weapon.position.set(side * size * 0.35, 0, size * 0.3);
      group.add(weapon);

      // Weapon glow tip (red laser emitter)
      const weaponGlowGeometry = new THREE.SphereGeometry(size * 0.04, 8, 8);
      const weaponGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.9,
      });
      const weaponGlow = new THREE.Mesh(weaponGlowGeometry, weaponGlowMaterial);
      weaponGlow.position.set(side * size * 0.35, 0, size * 0.5);
      group.add(weaponGlow);
    }
  }

  // BOMBER - Heavy assault craft with armor and weapon pods
  createBomberMesh(group: any, size: number, color: number, THREE: any) {
    const primaryMaterial = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.85,
      roughness: 0.3,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.3,
    });

    const armorMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.9,
      roughness: 0.4,
    });

    // Heavy main hull (box-like and bulky)
    const hullGeometry = new THREE.BoxGeometry(size * 0.8, size * 0.6, size * 1.4);
    const hull = new THREE.Mesh(hullGeometry, primaryMaterial);
    group.add(hull);

    // Armored nose section
    const noseGeometry = new THREE.BoxGeometry(size * 0.6, size * 0.5, size * 0.4);
    const nose = new THREE.Mesh(noseGeometry, armorMaterial);
    nose.position.z = size * 0.9;
    group.add(nose);

    // Command bridge (raised structure)
    const bridgeGeometry = new THREE.BoxGeometry(size * 0.5, size * 0.4, size * 0.6);
    const bridge = new THREE.Mesh(bridgeGeometry, armorMaterial);
    bridge.position.set(0, size * 0.5, size * 0.2);
    group.add(bridge);

    // Bridge windows
    const windowGeometry = new THREE.BoxGeometry(size * 0.45, size * 0.15, size * 0.55);
    const windowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.6,
    });
    const windows = new THREE.Mesh(windowGeometry, windowMaterial);
    windows.position.set(0, size * 0.55, size * 0.2);
    group.add(windows);

    // Heavy armor plates (layered hull)
    for (let i = 0; i < 3; i++) {
      const plateGeometry = new THREE.BoxGeometry(size * 0.85, size * 0.12, size * 0.3);
      const plate = new THREE.Mesh(plateGeometry, armorMaterial);
      plate.position.z = -size * 0.2 - i * size * 0.3;
      plate.position.y = size * 0.05;
      group.add(plate);
    }

    // Massive weapon pods (underslung)
    for (let side = -1; side <= 1; side += 2) {
      const podGeometry = new THREE.BoxGeometry(size * 0.3, size * 0.4, size * 1.0);
      const pod = new THREE.Mesh(podGeometry, armorMaterial);
      pod.position.set(side * size * 0.6, -size * 0.3, 0);
      group.add(pod);

      // Missile tubes (visible warheads)
      for (let i = 0; i < 3; i++) {
        const missileGeometry = new THREE.CylinderGeometry(size * 0.05, size * 0.05, size * 0.2, 6);
        const missile = new THREE.Mesh(missileGeometry, primaryMaterial);
        missile.rotation.x = Math.PI / 2;
        missile.position.set(side * size * 0.6, -size * 0.45, size * 0.2 - i * size * 0.3);
        group.add(missile);
      }
    }

    // Quad engine array (four large thrusters with beautiful glow)
    for (let x = -1; x <= 1; x += 2) {
      for (let y = -1; y <= 1; y += 2) {
        const engineGeometry = new THREE.CylinderGeometry(size * 0.15, size * 0.18, size * 0.4, 12);
        const engine = new THREE.Mesh(engineGeometry, armorMaterial);
        engine.rotation.x = Math.PI / 2;
        engine.position.set(x * size * 0.3, y * size * 0.2, -size * 0.8);
        group.add(engine);

        // Inner thruster glow (bright orange plasma core)
        const innerGlowGeometry = new THREE.CylinderGeometry(size * 0.15, size * 0.1, size * 0.25, 12);
        const innerGlowMaterial = new THREE.MeshBasicMaterial({
          color: 0xffaa00,
          transparent: true,
          opacity: 1.0,
        });
        const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
        innerGlow.rotation.x = Math.PI / 2;
        innerGlow.position.set(x * size * 0.3, y * size * 0.2, -size * 1.05);
        group.add(innerGlow);

        // Outer thruster glow (volumetric orange plume)
        const outerGlowGeometry = new THREE.CylinderGeometry(size * 0.18, size * 0.28, size * 0.5, 12);
        const outerGlowMaterial = new THREE.MeshBasicMaterial({
          color: 0xff4400,
          transparent: true,
          opacity: 0.5,
        });
        const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
        outerGlow.rotation.x = Math.PI / 2;
        outerGlow.position.set(x * size * 0.3, y * size * 0.2, -size * 1.2);
        group.add(outerGlow);

        // Extended thruster trail (fading plasma)
        const trailGeometry = new THREE.CylinderGeometry(size * 0.22, size * 0.35, size * 0.6, 12);
        const trailMaterial = new THREE.MeshBasicMaterial({
          color: 0xff2200,
          transparent: true,
          opacity: 0.25,
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.rotation.x = Math.PI / 2;
        trail.position.set(x * size * 0.3, y * size * 0.2, -size * 1.5);
        group.add(trail);

        // Thruster point light for illumination
        const thrusterLight = new THREE.PointLight(0xff6600, 5, size * 2.5);
        thrusterLight.position.set(x * size * 0.3, y * size * 0.2, -size * 1.05);
        group.add(thrusterLight);
      }
    }

    // Sensor array (antenna on top)
    const antennaGeometry = new THREE.CylinderGeometry(size * 0.02, size * 0.02, size * 0.3, 6);
    const antenna = new THREE.Mesh(antennaGeometry, armorMaterial);
    antenna.position.set(0, size * 0.8, 0);
    group.add(antenna);

    const dishGeometry = new THREE.CylinderGeometry(size * 0.1, size * 0.08, size * 0.05, 12);
    const dish = new THREE.Mesh(dishGeometry, primaryMaterial);
    dish.position.set(0, size * 0.95, 0);
    group.add(dish);
  }

  // INTERCEPTOR - Blade-like speed demon
  createInterceptorMesh(group: any, size: number, color: number, THREE: any) {
    const primaryMaterial = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.95,
      roughness: 0.15,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.5,
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      metalness: 1.0,
      roughness: 0.05,
    });

    // Streamlined main body (flattened blade shape)
    const bodyGeometry = new THREE.BoxGeometry(size * 0.4, size * 0.2, size * 1.6);
    const body = new THREE.Mesh(bodyGeometry, primaryMaterial);
    group.add(body);

    // Razor-sharp nose (double-edged blade)
    const noseGeometry = new THREE.ConeGeometry(size * 0.2, size * 0.5, 3);
    const nose = new THREE.Mesh(noseGeometry, accentMaterial);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = size * 1.05;
    group.add(nose);

    // Sleek cockpit (minimal canopy)
    const cockpitGeometry = new THREE.SphereGeometry(size * 0.12, 12, 12);
    const cockpitMaterial = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8,
      emissive: new THREE.Color(0xff8800),
      emissiveIntensity: 0.6,
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, size * 0.15, size * 0.5);
    cockpit.scale.set(0.8, 0.6, 1.0);
    group.add(cockpit);

    // Angular razor wings (swept back aggressively)
    for (let side = -1; side <= 1; side += 2) {
      const wingGeometry = new THREE.BoxGeometry(size * 0.6, size * 0.05, size * 0.9);
      const wing = new THREE.Mesh(wingGeometry, primaryMaterial);
      wing.position.set(side * size * 0.5, 0, -size * 0.2);
      wing.rotation.y = side * 0.3;
      wing.rotation.z = side * -0.1;
      group.add(wing);

      // Wing blades (sharp edges)
      const bladeGeometry = new THREE.BoxGeometry(size * 0.15, size * 0.4, size * 0.06);
      const blade = new THREE.Mesh(bladeGeometry, accentMaterial);
      blade.position.set(side * size * 0.75, 0, -size * 0.4);
      blade.rotation.y = side * 0.2;
      group.add(blade);
    }

    // Triple engine cluster (triangular formation)
    const enginePositions = [
      { x: 0, y: size * 0.15 },
      { x: -size * 0.18, y: -size * 0.08 },
      { x: size * 0.18, y: -size * 0.08 }
    ];

    enginePositions.forEach(pos => {
      const engineGeometry = new THREE.CylinderGeometry(size * 0.1, size * 0.12, size * 0.4, 12);
      const engine = new THREE.Mesh(engineGeometry, accentMaterial);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(pos.x, pos.y, -size * 0.65);
      group.add(engine);

      // Inner core (brilliant white plasma)
      const coreGeometry = new THREE.CylinderGeometry(size * 0.08, size * 0.04, size * 0.2, 12);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0,
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      core.rotation.x = Math.PI / 2;
      core.position.set(pos.x, pos.y, -size * 0.92);
      group.add(core);

      // Middle plasma glow (yellow-white thrust)
      const plasmaGeometry = new THREE.CylinderGeometry(size * 0.12, size * 0.08, size * 0.35, 12);
      const plasmaMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffaa,
        transparent: true,
        opacity: 0.9,
      });
      const plasma = new THREE.Mesh(plasmaGeometry, plasmaMaterial);
      plasma.rotation.x = Math.PI / 2;
      plasma.position.set(pos.x, pos.y, -size * 1.05);
      group.add(plasma);

      // Outer thruster glow (yellow-orange plume)
      const outerGlowGeometry = new THREE.CylinderGeometry(size * 0.15, size * 0.22, size * 0.5, 12);
      const outerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffdd00,
        transparent: true,
        opacity: 0.6,
      });
      const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
      outerGlow.rotation.x = Math.PI / 2;
      outerGlow.position.set(pos.x, pos.y, -size * 1.25);
      group.add(outerGlow);

      // Extended thruster trail (fading yellow plasma)
      const trailGeometry = new THREE.CylinderGeometry(size * 0.18, size * 0.28, size * 0.6, 12);
      const trailMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.3,
      });
      const trail = new THREE.Mesh(trailGeometry, trailMaterial);
      trail.rotation.x = Math.PI / 2;
      trail.position.set(pos.x, pos.y, -size * 1.5);
      group.add(trail);

      // Thruster point light for illumination
      const thrusterLight = new THREE.PointLight(0xffffaa, 4.5, size * 2);
      thrusterLight.position.set(pos.x, pos.y, -size * 0.92);
      group.add(thrusterLight);
    });

    // Weapon rails (integrated pulse cannons)
    for (let side = -1; side <= 1; side += 2) {
      const railGeometry = new THREE.BoxGeometry(size * 0.08, size * 0.08, size * 0.8);
      const rail = new THREE.Mesh(railGeometry, accentMaterial);
      rail.position.set(side * size * 0.22, 0, size * 0.3);
      group.add(rail);

      // Barrel tip glow
      const tipGeometry = new THREE.CylinderGeometry(size * 0.04, size * 0.04, size * 0.1, 6);
      const tipMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.7,
      });
      const tip = new THREE.Mesh(tipGeometry, tipMaterial);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(side * size * 0.22, 0, size * 0.75);
      group.add(tip);
    }

    // Speed stabilizers (rear fins)
    for (let side = -1; side <= 1; side += 2) {
      const finGeometry = new THREE.BoxGeometry(size * 0.08, size * 0.3, size * 0.2);
      const fin = new THREE.Mesh(finGeometry, accentMaterial);
      fin.position.set(side * size * 0.15, size * 0.15, -size * 0.7);
      group.add(fin);
    }
  }

  // CRUISER - Heavy capital ship, large and menacing
  createCruiserMesh(group: any, size: number, color: number, THREE: any) {
    const primaryMaterial = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.9,
      roughness: 0.2,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.4,
    });

    const armorMaterial = new THREE.MeshStandardMaterial({
      color: 0x222233,
      metalness: 0.95,
      roughness: 0.15,
      emissive: new THREE.Color(0x110022),
      emissiveIntensity: 0.2,
    });

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.7,
    });

    // Main hull - elongated wedge shape (Star Destroyer inspired)
    const hullGeo = new THREE.BoxGeometry(size * 0.5, size * 0.2, size * 1.8);
    const hull = new THREE.Mesh(hullGeo, armorMaterial);
    group.add(hull);

    // Tapered bow (front wedge)
    const bowGeo = new THREE.ConeGeometry(size * 0.35, size * 0.8, 4);
    const bow = new THREE.Mesh(bowGeo, primaryMaterial);
    bow.rotation.x = -Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.z = size * 1.3;
    group.add(bow);

    // Command bridge (raised tower)
    const bridgeGeo = new THREE.BoxGeometry(size * 0.2, size * 0.15, size * 0.25);
    const bridge = new THREE.Mesh(bridgeGeo, armorMaterial);
    bridge.position.set(0, size * 0.18, -size * 0.3);
    group.add(bridge);

    // Bridge viewport
    const viewportGeo = new THREE.BoxGeometry(size * 0.18, size * 0.04, 0.5);
    const viewportMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.9,
    });
    const viewport = new THREE.Mesh(viewportGeo, viewportMat);
    viewport.position.set(0, size * 0.22, -size * 0.17);
    group.add(viewport);

    // Side weapon nacelles
    for (let side = -1; side <= 1; side += 2) {
      const nacelleGeo = new THREE.BoxGeometry(size * 0.15, size * 0.12, size * 0.6);
      const nacelle = new THREE.Mesh(nacelleGeo, primaryMaterial);
      nacelle.position.set(side * size * 0.35, 0, size * 0.2);
      group.add(nacelle);

      // Weapon barrel on each nacelle
      const barrelGeo = new THREE.CylinderGeometry(size * 0.02, size * 0.03, size * 0.4, 8);
      const barrel = new THREE.Mesh(barrelGeo, armorMaterial);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(side * size * 0.35, size * 0.08, size * 0.5);
      group.add(barrel);

      // Nacelle glow strip
      const stripGeo = new THREE.BoxGeometry(size * 0.13, size * 0.02, size * 0.55);
      const strip = new THREE.Mesh(stripGeo, glowMaterial);
      strip.position.set(side * size * 0.35, -size * 0.07, size * 0.2);
      group.add(strip);
    }

    // Engine array (3 engines at the back)
    for (let i = -1; i <= 1; i++) {
      const engineGeo = new THREE.CylinderGeometry(size * 0.06, size * 0.08, size * 0.15, 8);
      const engine = new THREE.Mesh(engineGeo, armorMaterial);
      engine.rotation.x = Math.PI / 2;
      engine.position.set(i * size * 0.15, 0, -size * 0.95);
      group.add(engine);

      // Engine glow
      const engineGlowGeo = new THREE.SphereGeometry(size * 0.07, 8, 8);
      const engineGlowMat = new THREE.MeshBasicMaterial({
        color: 0xcc00ff,
        transparent: true,
        opacity: 0.8,
      });
      const engineGlow = new THREE.Mesh(engineGlowGeo, engineGlowMat);
      engineGlow.position.set(i * size * 0.15, 0, -size * 1.02);
      group.add(engineGlow);
    }

    // Ventral fin
    const finGeo = new THREE.BoxGeometry(size * 0.02, size * 0.15, size * 0.5);
    const fin = new THREE.Mesh(finGeo, primaryMaterial);
    fin.position.set(0, -size * 0.18, -size * 0.4);
    group.add(fin);

    // Hull panel line details (thin dark lines)
    const panelGeo = new THREE.BoxGeometry(size * 0.52, size * 0.005, size * 0.005);
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    for (let z = -0.6; z <= 0.8; z += 0.35) {
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(0, size * 0.101, z * size);
      group.add(panel);
    }
  }

  // Spawn enemy ship from random direction
  spawn3DShip() {
    const THREE = this.THREE;

    if (this.enemyShips.length >= this.MAX_SHIPS_3D) return;

    // Random ship type - weighted spawn: cruisers are rare
    const roll = Math.random();
    let type: 'fighter' | 'bomber' | 'interceptor' | 'cruiser';
    if (roll < 0.4) type = 'fighter';
    else if (roll < 0.65) type = 'interceptor';
    else if (roll < 0.85) type = 'bomber';
    else type = 'cruiser'; // 15% chance

    const ship = this.create3DShipGeometry(type);

    // Spawn in spherical coordinates around megabot's current position
    const mp = this.megabotWorldPos;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    const spawnX = mp.x + this.SHIP_SPAWN_RADIUS * Math.sin(phi) * Math.cos(theta);
    const spawnY = mp.y + this.SHIP_SPAWN_RADIUS * Math.sin(phi) * Math.sin(theta);
    const spawnZ = mp.z + this.SHIP_SPAWN_RADIUS * Math.cos(phi);

    ship.group.position.set(spawnX, spawnY, spawnZ);

    // Calculate velocity toward megabot
    const dirX = mp.x - spawnX;
    const dirY = mp.y - spawnY;
    const dirZ = mp.z - spawnZ;
    const distance = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
    const speed = this.SHIP_SPEED_MIN + Math.random() * (this.SHIP_SPEED_MAX - this.SHIP_SPEED_MIN);

    const velocity = new THREE.Vector3(
      (dirX / distance) * speed,
      (dirY / distance) * speed,
      (dirZ / distance) * speed
    );

    // Point ship in direction of travel
    ship.group.lookAt(mp.x, mp.y, mp.z);

    this.enemyShips.push({
      ...ship,
      velocity,
      active: true,
      lastLaserTime: 0, // Track when ship last fired laser
    });

    this.scene.add(ship.group);
  }

  // Spawn a formation of ships with coordinated AI behavior
  spawnFormation() {
    const THREE = this.THREE;

    // Don't spawn if we have too many ships already
    if (this.enemyShips.length >= this.MAX_SHIPS_3D - 3) return;

    // Pick a random formation type
    const formationType = this.FORMATION_TYPES[Math.floor(Math.random() * this.FORMATION_TYPES.length)];
    const formationId = this.formationIdCounter++;


    switch (formationType) {
      case 'v-formation':
        this.spawnVFormation(formationId);
        break;
      case 'pincer':
        this.spawnPincerFormation(formationId);
        break;
      case 'bomber-escort':
        this.spawnBomberEscort(formationId);
        break;
      case 'orbit-strafe':
        this.spawnOrbitStrafe(formationId);
        break;
    }

    // Track formation
    this.formations.push({
      id: formationId,
      type: formationType,
      createdAt: this.time,
    });
  }

  // V-Formation: Fighters fly in V-shape, coordinated attacks
  spawnVFormation(formationId: number) {
    const THREE = this.THREE;

    // Pick a random approach direction
    const baseTheta = Math.random() * Math.PI * 2;
    const basePhi = Math.PI * 0.3 + Math.random() * Math.PI * 0.4; // Keep in visible range

    // Leader position
    const leaderX = this.SHIP_SPAWN_RADIUS * Math.sin(basePhi) * Math.cos(baseTheta);
    const leaderY = this.SHIP_SPAWN_RADIUS * Math.sin(basePhi) * Math.sin(baseTheta);
    const leaderZ = this.SHIP_SPAWN_RADIUS * Math.cos(basePhi);

    // Spawn 5 fighters in V shape
    const vOffsets = [
      { x: 0, y: 0 },      // Leader
      { x: -80, y: -60 },  // Left wing 1
      { x: 80, y: -60 },   // Right wing 1
      { x: -160, y: -120 }, // Left wing 2
      { x: 160, y: -120 },  // Right wing 2
    ];

    vOffsets.forEach((offset, index) => {
      if (this.enemyShips.length >= this.MAX_SHIPS_3D) return;

      const ship = this.create3DShipGeometry('fighter');

      // Calculate perpendicular offset vectors
      const toCenter = new THREE.Vector3(-leaderX, -leaderY, -leaderZ).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(toCenter, up).normalize();
      const realUp = new THREE.Vector3().crossVectors(right, toCenter).normalize();

      // Apply offset
      const spawnPos = new THREE.Vector3(leaderX, leaderY, leaderZ);
      spawnPos.add(right.clone().multiplyScalar(offset.x));
      spawnPos.add(realUp.clone().multiplyScalar(offset.y));

      ship.group.position.copy(spawnPos);

      // Slower, coordinated movement toward center
      const speed = 150; // Slower than normal for coordinated attack
      const velocity = toCenter.clone().multiplyScalar(speed);

      ship.group.lookAt(this.megabotWorldPos.x, this.megabotWorldPos.y, this.megabotWorldPos.z);

      this.enemyShips.push({
        ...ship,
        velocity,
        active: true,
        lastLaserTime: 0,
        formationId,
        formationType: 'v-formation',
        formationRole: index === 0 ? 'leader' : 'wingman',
        behavior: 'formation-attack', // New behavior type
      });

      this.scene.add(ship.group);
    });
  }

  // Pincer Maneuver: Two groups approach from opposite sides
  spawnPincerFormation(formationId: number) {
    const THREE = this.THREE;

    // Pick a random approach axis
    const baseTheta = Math.random() * Math.PI * 2;
    const basePhi = Math.PI * 0.5; // Approach from sides

    // Spawn two groups from opposite directions
    [-1, 1].forEach((side, groupIndex) => {
      const groupTheta = baseTheta + side * Math.PI; // Opposite directions

      // 2-3 ships per group
      const shipCount = 2 + Math.floor(Math.random() * 2);

      for (let i = 0; i < shipCount; i++) {
        if (this.enemyShips.length >= this.MAX_SHIPS_3D) return;

        const ship = this.create3DShipGeometry('interceptor');

        // Slight spread within group
        const spreadTheta = groupTheta + (i - shipCount/2) * 0.15;
        const spreadPhi = basePhi + (Math.random() - 0.5) * 0.3;

        const spawnX = this.SHIP_SPAWN_RADIUS * Math.sin(spreadPhi) * Math.cos(spreadTheta);
        const spawnY = this.SHIP_SPAWN_RADIUS * Math.sin(spreadPhi) * Math.sin(spreadTheta);
        const spawnZ = this.SHIP_SPAWN_RADIUS * Math.cos(spreadPhi);

        ship.group.position.set(spawnX, spawnY, spawnZ);

        // Fast interceptors
        const speed = 300 + Math.random() * 100;
        const toCenter = new THREE.Vector3(-spawnX, -spawnY, -spawnZ).normalize();
        const velocity = toCenter.multiplyScalar(speed);

        ship.group.lookAt(this.megabotWorldPos.x, this.megabotWorldPos.y, this.megabotWorldPos.z);

        this.enemyShips.push({
          ...ship,
          velocity,
          active: true,
          lastLaserTime: 0,
          formationId,
          formationType: 'pincer',
          formationRole: `group-${groupIndex}`,
          behavior: 'pincer-attack',
          pincerPhase: 'approach', // approach -> strafe -> retreat
        });

        this.scene.add(ship.group);
      }
    });
  }

  // Bomber Escort: Interceptors protect slower bombers
  spawnBomberEscort(formationId: number) {
    const THREE = this.THREE;

    // Pick approach direction
    const baseTheta = Math.random() * Math.PI * 2;
    const basePhi = Math.PI * 0.3 + Math.random() * Math.PI * 0.4;

    const baseX = this.SHIP_SPAWN_RADIUS * Math.sin(basePhi) * Math.cos(baseTheta);
    const baseY = this.SHIP_SPAWN_RADIUS * Math.sin(basePhi) * Math.sin(baseTheta);
    const baseZ = this.SHIP_SPAWN_RADIUS * Math.cos(basePhi);

    const toCenter = new THREE.Vector3(-baseX, -baseY, -baseZ).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(toCenter, up).normalize();
    const realUp = new THREE.Vector3().crossVectors(right, toCenter).normalize();

    // Spawn 1 bomber in center
    if (this.enemyShips.length < this.MAX_SHIPS_3D) {
      const bomber = this.create3DShipGeometry('bomber');
      bomber.group.position.set(baseX, baseY, baseZ);

      const bomberSpeed = 100; // Slow bomber
      const bomberVelocity = toCenter.clone().multiplyScalar(bomberSpeed);

      bomber.group.lookAt(this.megabotWorldPos.x, this.megabotWorldPos.y, this.megabotWorldPos.z);

      const bomberShip = {
        ...bomber,
        velocity: bomberVelocity,
        active: true,
        lastLaserTime: 0,
        formationId,
        formationType: 'bomber-escort',
        formationRole: 'bomber',
        behavior: 'bomber-advance',
      };
      this.enemyShips.push(bomberShip);
      // Index bomber for O(1) escort lookup
      this._formationBomberIndex.set(formationId, bomberShip);

      this.scene.add(bomber.group);
    }

    // Spawn 2-4 interceptor escorts
    const escortCount = 2 + Math.floor(Math.random() * 3);
    const escortOffsets = [
      { x: -100, y: 50 },
      { x: 100, y: 50 },
      { x: -100, y: -50 },
      { x: 100, y: -50 },
    ];

    for (let i = 0; i < escortCount && i < escortOffsets.length; i++) {
      if (this.enemyShips.length >= this.MAX_SHIPS_3D) break;

      const escort = this.create3DShipGeometry('interceptor');

      const offset = escortOffsets[i];
      const escortPos = new THREE.Vector3(baseX, baseY, baseZ);
      escortPos.add(right.clone().multiplyScalar(offset.x));
      escortPos.add(realUp.clone().multiplyScalar(offset.y));

      escort.group.position.copy(escortPos);

      // Escorts match bomber speed but orbit around it
      const escortSpeed = 120;
      const escortVelocity = toCenter.clone().multiplyScalar(escortSpeed);

      escort.group.lookAt(this.megabotWorldPos.x, this.megabotWorldPos.y, this.megabotWorldPos.z);

      this.enemyShips.push({
        ...escort,
        velocity: escortVelocity,
        active: true,
        lastLaserTime: 0,
        formationId,
        formationType: 'bomber-escort',
        formationRole: 'escort',
        behavior: 'escort-protect',
        escortTarget: formationId, // Reference to bomber's formation
        orbitAngle: (i / escortCount) * Math.PI * 2,
      });

      this.scene.add(escort.group);
    }
  }

  // Orbit & Strafe: Ships circle at distance, firing, instead of kamikaze
  spawnOrbitStrafe(formationId: number) {
    const THREE = this.THREE;

    // Pick orbit plane
    const orbitRadius = 600; // Distance to orbit at
    const baseTheta = Math.random() * Math.PI * 2;

    // Spawn 3-4 ships that will orbit
    const shipCount = 3 + Math.floor(Math.random() * 2);

    for (let i = 0; i < shipCount; i++) {
      if (this.enemyShips.length >= this.MAX_SHIPS_3D) return;

      const ship = this.create3DShipGeometry('fighter');

      // Start from spawn radius, they'll move to orbit radius
      const startTheta = baseTheta + (i / shipCount) * Math.PI * 2;
      const startPhi = Math.PI * 0.5; // Equatorial plane

      const spawnX = this.SHIP_SPAWN_RADIUS * Math.sin(startPhi) * Math.cos(startTheta);
      const spawnY = this.SHIP_SPAWN_RADIUS * Math.sin(startPhi) * Math.sin(startTheta);
      const spawnZ = this.SHIP_SPAWN_RADIUS * Math.cos(startPhi);

      ship.group.position.set(spawnX, spawnY, spawnZ);

      // Initial velocity toward orbit position (not center)
      const targetOrbitX = orbitRadius * Math.cos(startTheta);
      const targetOrbitY = 0;
      const targetOrbitZ = orbitRadius * Math.sin(startTheta);

      const toOrbit = new THREE.Vector3(
        targetOrbitX - spawnX,
        targetOrbitY - spawnY,
        targetOrbitZ - spawnZ
      ).normalize();

      const speed = 250;
      const velocity = toOrbit.multiplyScalar(speed);

      ship.group.lookAt(this.megabotWorldPos.x, this.megabotWorldPos.y, this.megabotWorldPos.z);

      this.enemyShips.push({
        ...ship,
        velocity,
        active: true,
        lastLaserTime: 0,
        formationId,
        formationType: 'orbit-strafe',
        formationRole: 'orbiter',
        behavior: 'orbit-strafe',
        orbitPhase: 'approach', // approach -> orbit -> strafe
        orbitRadius,
        orbitAngle: startTheta,
        orbitSpeed: 0.8 + Math.random() * 0.4, // Radians per second
      });

      this.scene.add(ship.group);
    }
  }

  // Create 3D missile
  create3DMissile(startPos: any, targetPos: any) {
    const THREE = this.THREE;

    if (this.missiles3D.length >= this.MAX_MISSILES_3D) return;

    const group = new THREE.Group();

    // Missile body — cylindrical fuselage
    const bodyGeometry = this._getCachedGeometry('missile_body2', () => new THREE.CylinderGeometry(2.5, 3.5, 22, 8));
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.95,
      roughness: 0.15,
      emissive: new THREE.Color(0x222233),
      emissiveIntensity: 0.3,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2; // Orient along Z axis (forward)
    group.add(body);

    // Nose cone — sharp warhead tip
    const noseGeometry = this._getCachedGeometry('missile_nose2', () => new THREE.ConeGeometry(2.5, 10, 8));
    const noseMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      metalness: 0.8,
      roughness: 0.2,
      emissive: new THREE.Color(0xff1111),
      emissiveIntensity: 0.4,
    });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.rotation.x = -Math.PI / 2; // Point forward
    nose.position.z = 16; // Front of body
    group.add(nose);

    // Tail fins — 4 stabilizer fins
    const finGeometry = this._getCachedGeometry('missile_fin', () => new THREE.BoxGeometry(1, 8, 5));
    const finMaterial = new THREE.MeshStandardMaterial({
      color: 0x666688,
      metalness: 0.9,
      roughness: 0.2,
    });
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(finGeometry, finMaterial);
      const angle = (i / 4) * Math.PI * 2;
      fin.position.set(Math.cos(angle) * 4, Math.sin(angle) * 4, -9);
      fin.rotation.z = angle;
      group.add(fin);
    }

    // Engine exhaust glow — small bright dot at the back
    const exhaustGeometry = this._getCachedGeometry('missile_exhaust', () => new THREE.SphereGeometry(3, 8, 8));
    const exhaustMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ccff,
      transparent: true,
      opacity: 0.8,
    });
    const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
    exhaust.position.z = -12; // Back of missile
    group.add(exhaust);

    // Accent band around the body
    const bandGeometry = this._getCachedGeometry('missile_band', () => new THREE.CylinderGeometry(3.7, 3.7, 2, 8));
    const bandMaterial = new THREE.MeshBasicMaterial({
      color: 0x4a90e2,
      transparent: true,
      opacity: 0.7,
    });
    const band = new THREE.Mesh(bandGeometry, bandMaterial);
    band.rotation.x = Math.PI / 2;
    band.position.z = 5; // Mid-body
    group.add(band);

    // Point light — engine glow (smaller range than before)
    const missileLight = new THREE.PointLight(0x00ccff, 4, 60);
    missileLight.position.z = -12;
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

    const THREE = this.THREE;

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
    // Scale aim distance with camera distance so aiming stays accurate at all zoom levels
    const distance = Math.max(2000, this.cameraDistance * 1.5);
    const targetPos = this.camera.position.clone().add(dir.multiplyScalar(distance));

    const missile = this.create3DMissile(launchPos, targetPos);
    // Apply homing at upgrade level 1+
    if (missile && this.upgradeLevel >= 1) {
      (missile as any).homing = true;
    }
  }

  // Launch cluster missiles (3 missiles in spread pattern) - Shift+Click
  launchClusterMissiles(targetScreenPos: { x: number; y: number }) {
    if (!this.mainMegabot) return;

    const THREE = this.THREE;

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
    // Scale aim distance with camera distance so cluster aiming stays accurate at all zoom levels
    const distance = Math.max(2000, this.cameraDistance * 1.5);
    const centerTarget = this.camera.position.clone().add(dir.clone().multiplyScalar(distance));

    // Calculate spread vectors perpendicular to the direction
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    const spreadUp = new THREE.Vector3().crossVectors(right, dir).normalize();

    const spreadAmount = 300; // Spread distance at target

    // Fire 3 missiles in a spread pattern
    const spreadOffsets = [
      { x: 0, y: 0 },           // Center
      { x: -spreadAmount, y: spreadAmount * 0.5 },  // Upper left
      { x: spreadAmount, y: spreadAmount * 0.5 },   // Upper right
    ];

    spreadOffsets.forEach((offset, index) => {
      const targetPos = centerTarget.clone();
      targetPos.add(right.clone().multiplyScalar(offset.x));
      targetPos.add(spreadUp.clone().multiplyScalar(offset.y));

      // Slight delay between missiles for visual effect
      setTimeout(() => {
        // Alternate launch positions (left and right shoulders)
        const shoulderOffset = new THREE.Vector3(
          (index === 1 ? -1 : index === 2 ? 1 : 0) * this.MAIN_SIZE * 0.3,
          this.MAIN_SIZE * 0.7,
          this.MAIN_SIZE * 0.2
        );
        shoulderOffset.applyQuaternion(this.mainMegabot.quaternion);
        const missileStart = new THREE.Vector3().addVectors(this.mainMegabot.position, shoulderOffset);

        this.create3DMissile(missileStart, targetPos);
      }, index * 50);
    });

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

  // Create enemy laser beam
  createEnemyLaser(ship: any) {
    const THREE = this.THREE;

    if (this.enemyLasers.length >= this.MAX_ENEMY_LASERS) return;

    // Get ship's weapon position (front of ship)
    const shipPos = ship.group.position;
    const shipDir = new THREE.Vector3(0, 0, 1);
    shipDir.applyQuaternion(ship.group.quaternion);

    // Laser shoots toward megabot
    const megabotPos = this.megabotWorldPos.clone();
    const toMegabot = new THREE.Vector3().subVectors(megabotPos, shipPos).normalize();

    // Create laser beam geometry (shared across all standard lasers)
    const laserLength = 50;
    const laserGeometry = this._getCachedGeometry('enemy_laser', () => new THREE.CylinderGeometry(0.8, 0.8, laserLength, 8));
    const laserMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.9,
    });
    const laserMesh = new THREE.Mesh(laserGeometry, laserMaterial);

    // Create laser glow (shared geometry)
    const glowGeometry = this._getCachedGeometry('enemy_laser_glow', () => new THREE.CylinderGeometry(2, 2, laserLength, 8));
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.4,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);

    const laserGroup = new THREE.Group();
    laserGroup.add(laserMesh);
    laserGroup.add(glowMesh);

    // Position laser at ship's weapon
    laserGroup.position.copy(shipPos);
    laserGroup.position.add(shipDir.clone().multiplyScalar(ship.size * 0.3));

    // Orient laser toward megabot
    laserGroup.lookAt(megabotPos);
    laserGroup.rotateX(Math.PI / 2); // Adjust for cylinder orientation

    // Laser velocity
    const velocity = toMegabot.multiplyScalar(this.ENEMY_LASER_SPEED);

    const laser = {
      group: laserGroup,
      velocity,
      lifetime: 0,
      maxLifetime: 2,
      active: true,
      damage: 5,
    };

    this.enemyLasers.push(laser);
    this.scene.add(laserGroup);

    return laser;
  }

  // Create Rapid Laser for Interceptors - fast, low-damage cyan bursts
  createRapidLaser(ship: any) {
    const THREE = this.THREE;

    if (this.enemyLasers.length >= this.MAX_ENEMY_LASERS) return;

    const shipPos = ship.group.position;
    const megabotPos = this.megabotWorldPos.clone();
    const toMegabot = new THREE.Vector3().subVectors(megabotPos, shipPos).normalize();

    // Thin, fast cyan laser (shared geometry)
    const laserLength = 30;
    const laserGeometry = this._getCachedGeometry('rapid_laser', () => new THREE.CylinderGeometry(0.4, 0.4, laserLength, 6));
    const laserMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.95,
    });
    const laserMesh = new THREE.Mesh(laserGeometry, laserMaterial);

    // Bright cyan glow (shared geometry)
    const glowGeometry = this._getCachedGeometry('rapid_laser_glow', () => new THREE.CylinderGeometry(1.5, 1.5, laserLength, 6));
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ccff,
      transparent: true,
      opacity: 0.5,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);

    const laserGroup = new THREE.Group();
    laserGroup.add(laserMesh);
    laserGroup.add(glowMesh);

    laserGroup.position.copy(shipPos);
    laserGroup.lookAt(megabotPos);
    laserGroup.rotateX(Math.PI / 2);

    // Faster velocity for rapid lasers
    const velocity = toMegabot.multiplyScalar(this.ENEMY_LASER_SPEED * 1.5);

    const laser = {
      group: laserGroup,
      velocity,
      lifetime: 0,
      maxLifetime: 1.5,
      active: true,
      damage: 2, // Lower damage per hit
      type: 'rapid',
    };

    this.enemyLasers.push(laser);
    this.scene.add(laserGroup);

    return laser;
  }

  // Create Plasma Cannon for Bombers - slow charge, high damage green plasma
  createPlasmaCannon(ship: any) {
    const THREE = this.THREE;

    if (this.enemyLasers.length >= this.MAX_ENEMY_LASERS) return;

    const shipPos = ship.group.position;
    const megabotPos = this.megabotWorldPos.clone();
    const toMegabot = new THREE.Vector3().subVectors(megabotPos, shipPos).normalize();

    // Large plasma ball (shared geometry)
    const plasmaGeometry = this._getCachedGeometry('plasma_ball', () => new THREE.SphereGeometry(8, 16, 16));
    const plasmaMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.9,
    });
    const plasmaMesh = new THREE.Mesh(plasmaGeometry, plasmaMaterial);

    // Outer glow (shared geometry)
    const glowGeometry = this._getCachedGeometry('plasma_glow', () => new THREE.SphereGeometry(15, 16, 16));
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x44ff44,
      transparent: true,
      opacity: 0.4,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);

    // Inner core (shared geometry)
    const coreGeometry = this._getCachedGeometry('plasma_core', () => new THREE.SphereGeometry(4, 12, 12));
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);

    const plasmaGroup = new THREE.Group();
    plasmaGroup.add(glowMesh);
    plasmaGroup.add(plasmaMesh);
    plasmaGroup.add(coreMesh);

    // Add point light for dramatic effect
    const plasmaLight = new THREE.PointLight(0x00ff00, 2, 150);
    plasmaGroup.add(plasmaLight);

    plasmaGroup.position.copy(shipPos);

    // Slower velocity for heavy plasma
    const velocity = toMegabot.multiplyScalar(this.ENEMY_LASER_SPEED * 0.6);

    const plasma = {
      group: plasmaGroup,
      velocity,
      lifetime: 0,
      maxLifetime: 4, // Longer range
      active: true,
      damage: 25, // High damage!
      type: 'plasma',
      pulsePhase: 0, // For pulsing animation
    };

    this.enemyLasers.push(plasma);
    this.scene.add(plasmaGroup);

    return plasma;
  }

  // Fire rapid burst (3 shots in quick succession) - uses RAF-synced burst queue instead of setTimeout
  fireRapidBurst(ship: any) {
    const now = this.time;
    for (let i = 0; i < 3; i++) {
      this._pendingBursts.push({ ship, fireTime: now + i * 0.08 });
    }
  }

  // Process pending burst queue (called from update loop instead of setTimeout)
  private _processBurstQueue() {
    const now = this.time;
    for (let i = this._pendingBursts.length - 1; i >= 0; i--) {
      const burst = this._pendingBursts[i];
      if (now >= burst.fireTime) {
        if (burst.ship.active) {
          this.createRapidLaser(burst.ship);
        }
        this._pendingBursts.splice(i, 1);
      }
    }
  }

  // Pre-allocate explosion pool to avoid per-explosion Three.js object creation
  private _initExplosionPool() {
    const THREE = this.THREE;
    const particleCount = 50;

    for (let p = 0; p < this.MAX_EXPLOSIONS_3D; p++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.PointsMaterial({
        color: 0xff6600,
        size: 25,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
      });

      const particles = new THREE.Points(geometry, material);
      particles.visible = false;

      const light = new THREE.PointLight(0xff6600, 20, 250);
      light.visible = false;

      // Pre-allocate velocity array with plain objects
      const velocities: { x: number; y: number; z: number }[] = [];
      for (let i = 0; i < particleCount; i++) {
        velocities.push({ x: 0, y: 0, z: 0 });
      }

      this._explosionPool.push({
        particles,
        velocities,
        light,
        lifetime: 0,
        maxLifetime: 0.5,
        active: false,
        size: 50,
        _pooled: true,
      });

      this.scene.add(particles);
      this.scene.add(light);
    }
    this._explosionPoolInitialized = true;
  }

  // Create 3D explosion effect - uses object pool to avoid allocation
  create3DExplosion(position: any, size: number) {
    if (this.explosions3D.length >= this.MAX_EXPLOSIONS_3D) return;

    // Find an inactive pooled explosion
    let explosion: any = null;
    for (let p = 0; p < this._explosionPool.length; p++) {
      if (!this._explosionPool[p].active) {
        explosion = this._explosionPool[p];
        break;
      }
    }

    if (!explosion) return; // All pool slots in use

    // Reset and configure the pooled explosion
    const particleCount = 50;
    const positions = explosion.particles.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      explosion.velocities[i].x = (Math.random() - 0.5) * size * 2;
      explosion.velocities[i].y = (Math.random() - 0.5) * size * 2;
      explosion.velocities[i].z = (Math.random() - 0.5) * size * 2;
    }
    explosion.particles.geometry.attributes.position.needsUpdate = true;

    // Update material size for this explosion
    explosion.particles.material.size = size * 0.5;
    explosion.particles.material.opacity = 1.0;
    explosion.particles.visible = true;

    // Update light
    explosion.light.position.copy(position);
    explosion.light.distance = size * 5;
    explosion.light.intensity = 20;
    explosion.light.visible = true;

    explosion.lifetime = 0;
    explosion.maxLifetime = 0.5;
    explosion.active = true;
    explosion.size = size;

    this.explosions3D.push(explosion);
  }

  // Update Orbit & Strafe behavior
  updateOrbitStrafeBehavior(ship: any, dt: number, distToMegabot: number) {
    const THREE = this.THREE;

    if (ship.orbitPhase === 'approach') {
      // Move toward orbit radius
      if (distToMegabot > ship.orbitRadius + 50) {
        // Still approaching
        ship.group.position.x += ship.velocity.x * dt;
        ship.group.position.y += ship.velocity.y * dt;
        ship.group.position.z += ship.velocity.z * dt;
      } else {
        // Reached orbit, switch to orbiting
        ship.orbitPhase = 'orbit';
      }
    } else if (ship.orbitPhase === 'orbit') {
      // Orbit around megabot
      ship.orbitAngle += ship.orbitSpeed * dt;

      // Calculate new position on orbit
      const newX = ship.orbitRadius * Math.cos(ship.orbitAngle);
      const newZ = ship.orbitRadius * Math.sin(ship.orbitAngle);

      // Smooth transition to orbit position
      ship.group.position.x += (newX - ship.group.position.x) * dt * 2;
      ship.group.position.z += (newZ - ship.group.position.z) * dt * 2;
      ship.group.position.y += (0 - ship.group.position.y) * dt * 2; // Level out

      // Face the center (Megabot)
      ship.group.lookAt(this.megabotWorldPos.x, this.megabotWorldPos.y, this.megabotWorldPos.z);

      // Occasionally strafe closer
      if (Math.random() < 0.002) {
        ship.orbitPhase = 'strafe';
        ship.strafeTarget = ship.orbitRadius * 0.5; // Move to half orbit radius
      }
    } else if (ship.orbitPhase === 'strafe') {
      // Strafe run - move closer while orbiting
      ship.orbitAngle += ship.orbitSpeed * 1.5 * dt; // Faster during strafe

      const currentRadius = Math.sqrt(ship.group.position.x ** 2 + ship.group.position.z ** 2);
      const targetRadius = ship.strafeTarget;

      // Spiral inward
      const newRadius = currentRadius + (targetRadius - currentRadius) * dt * 2;
      const newX = newRadius * Math.cos(ship.orbitAngle);
      const newZ = newRadius * Math.sin(ship.orbitAngle);

      ship.group.position.x = newX;
      ship.group.position.z = newZ;
      ship.group.lookAt(this.megabotWorldPos.x, this.megabotWorldPos.y, this.megabotWorldPos.z);

      // After strafe, return to orbit
      if (currentRadius < targetRadius + 20) {
        ship.orbitPhase = 'retreat';
      }
    } else if (ship.orbitPhase === 'retreat') {
      // Return to orbit radius
      ship.orbitAngle += ship.orbitSpeed * dt;

      const currentRadius = Math.sqrt(ship.group.position.x ** 2 + ship.group.position.z ** 2);

      // Spiral outward
      const newRadius = currentRadius + (ship.orbitRadius - currentRadius) * dt * 1.5;
      const newX = newRadius * Math.cos(ship.orbitAngle);
      const newZ = newRadius * Math.sin(ship.orbitAngle);

      ship.group.position.x = newX;
      ship.group.position.z = newZ;
      ship.group.lookAt(this.megabotWorldPos.x, this.megabotWorldPos.y, this.megabotWorldPos.z);

      if (currentRadius > ship.orbitRadius - 30) {
        ship.orbitPhase = 'orbit';
      }
    }
  }

  // Update Pincer attack behavior
  updatePincerBehavior(ship: any, dt: number, distToMegabot: number) {
    const THREE = this.THREE;

    if (ship.pincerPhase === 'approach') {
      // Move toward megabot until close enough
      ship.group.position.x += ship.velocity.x * dt;
      ship.group.position.y += ship.velocity.y * dt;
      ship.group.position.z += ship.velocity.z * dt;

      // Switch to strafe when close
      if (distToMegabot < 500) {
        ship.pincerPhase = 'strafe';
        // Calculate perpendicular velocity for strafing
        const pos = ship.group.position;
        const perpX = -pos.z;
        const perpZ = pos.x;
        const perpLen = Math.sqrt(perpX * perpX + perpZ * perpZ);

        if (!ship.strafeVelocity) ship.strafeVelocity = new THREE.Vector3();
        ship.strafeVelocity.set(
          (perpX / perpLen) * 200,
          0,
          (perpZ / perpLen) * 200
        );
        ship.strafeTime = 0;
      }
    } else if (ship.pincerPhase === 'strafe') {
      // Strafe perpendicular to megabot
      ship.group.position.x += ship.strafeVelocity.x * dt;
      ship.group.position.z += ship.strafeVelocity.z * dt;

      // Keep facing megabot
      ship.group.lookAt(this.megabotWorldPos.x, this.megabotWorldPos.y, this.megabotWorldPos.z);

      ship.strafeTime += dt;

      // After strafing, retreat
      if (ship.strafeTime > 2) {
        ship.pincerPhase = 'retreat';
        // Velocity away from megabot
        const pos = ship.group.position;
        const dist = pos.length();
        ship.velocity.set(
          (pos.x / dist) * 150,
          (pos.y / dist) * 150,
          (pos.z / dist) * 150
        );
      }
    } else if (ship.pincerPhase === 'retreat') {
      // Move away from megabot
      ship.group.position.x += ship.velocity.x * dt;
      ship.group.position.y += ship.velocity.y * dt;
      ship.group.position.z += ship.velocity.z * dt;

      // Re-engage after retreating far enough
      if (distToMegabot > 800) {
        ship.pincerPhase = 'approach';
        // Turn around toward megabot
        const toMega = this._tmpVec3A.copy(this.megabotWorldPos).sub(ship.group.position).normalize();
        ship.velocity.set(toMega.x * 300, toMega.y * 300, toMega.z * 300);
      }
    }
  }

  // Update Escort protection behavior
  updateEscortBehavior(ship: any, dt: number) {
    const THREE = this.THREE;

    // Find the bomber we're escorting (O(1) lookup via cached index)
    const bomber = this._formationBomberIndex.get(ship.escortTarget);
    // Verify bomber is still in the scene (group.parent is null after scene.remove)
    const bomberAlive = bomber && bomber.group.parent;

    if (bomberAlive) {
      // Orbit around the bomber
      ship.orbitAngle += 1.5 * dt;

      const orbitDist = 80; // Distance from bomber
      const targetX = bomber.group.position.x + Math.cos(ship.orbitAngle) * orbitDist;
      const targetY = bomber.group.position.y + Math.sin(ship.orbitAngle * 0.5) * 30;
      const targetZ = bomber.group.position.z + Math.sin(ship.orbitAngle) * orbitDist;

      // Smooth movement to target position
      ship.group.position.x += (targetX - ship.group.position.x) * dt * 3;
      ship.group.position.y += (targetY - ship.group.position.y) * dt * 3;
      ship.group.position.z += (targetZ - ship.group.position.z) * dt * 3;

      // Face megabot (threat direction)
      ship.group.lookAt(this.megabotWorldPos.x, this.megabotWorldPos.y, this.megabotWorldPos.z);
    } else {
      // Bomber destroyed, clean up index and go aggressive toward megabot
      this._formationBomberIndex.delete(ship.escortTarget);
      ship.behavior = undefined; // Default kamikaze
      const toMega = this._tmpVec3A.copy(this.megabotWorldPos).sub(ship.group.position).normalize();
      const speed = 400; // Angry escort
      ship.velocity.set(toMega.x * speed, toMega.y * speed, toMega.z * speed);
    }
  }

  // WASD / Arrow key movement for Megabot
  updateMegabotMovement(dt: number) {
    if (!this.mainMegabot) return;

    // Q/E manual rotation — independent of camera and movement
    const manualRotating = this.keysPressed.has('q') || this.keysPressed.has('e');
    if (this.keysPressed.has('q')) {
      this.mainMegabot.rotation.y += this.MEGABOT_ROTATE_SPEED * dt;
    }
    if (this.keysPressed.has('e')) {
      this.mainMegabot.rotation.y -= this.MEGABOT_ROTATE_SPEED * dt;
    }

    let moveX = 0;
    let moveZ = 0;

    if (this.keysPressed.has('w') || this.keysPressed.has('arrowup')) moveZ -= 1;
    if (this.keysPressed.has('s') || this.keysPressed.has('arrowdown')) moveZ += 1;
    if (this.keysPressed.has('a') || this.keysPressed.has('arrowleft')) moveX -= 1;
    if (this.keysPressed.has('d') || this.keysPressed.has('arrowright')) moveX += 1;

    if (moveX === 0 && moveZ === 0) {
      // Not moving - decelerate walk cycle and return to standing height
      this.isWalking = false;
      // Smoothly return to standing Y
      this.mainMegabot.position.y += (this.MEGABOT_STAND_Y - this.mainMegabot.position.y) * 0.1;
      return;
    }

    this.isWalking = true;

    // Normalize diagonal movement
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    moveX /= len;
    moveZ /= len;

    // Apply movement relative to camera yaw so "forward" is always screen-up
    const cosA = Math.cos(this.cameraYaw);
    const sinA = Math.sin(this.cameraYaw);
    const worldX = moveX * cosA - moveZ * sinA;
    const worldZ = moveX * sinA + moveZ * cosA;

    const speed = this.MEGABOT_MOVE_SPEED * dt;
    this.mainMegabot.position.x += worldX * speed;
    this.mainMegabot.position.z += worldZ * speed;

    // Advance walk cycle proportional to speed
    this.walkCycle += dt * this.WALK_CYCLE_SPEED;

    // Walking bob with secondary bounce harmonic + footfall dip
    const primaryBob = Math.abs(Math.sin(this.walkCycle)) * this.WALK_BOB_HEIGHT;
    const secondaryBounce = Math.abs(Math.sin(this.walkCycle * 2)) * (this.WALK_BOB_HEIGHT * 0.15);
    // Footfall dip: brief downward dip when sin crosses zero (foot plants)
    const sinCycle = Math.sin(this.walkCycle);
    const footfallDip = (1 - Math.abs(sinCycle)) * -4; // -4 unit dip at zero crossings
    this.mainMegabot.position.y = this.MEGABOT_STAND_Y + primaryBob + secondaryBounce + footfallDip;

    // Turn megabot to face movement direction (snappier lerp)
    // Only auto-face when Q/E are NOT pressed — manual rotation takes priority
    if (!this.trackingTarget && !manualRotating) {
      const targetAngle = Math.atan2(worldX, worldZ);
      const angleDiff = targetAngle - this.mainMegabot.rotation.y;
      const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      this.mainMegabot.rotation.y += normalizedDiff * 0.2;
    }

    // GODZILLA STOMP! Check footfall timing - stomp on downbeat of walk cycle
    const prevSinCycle = Math.sin(this.walkCycle - dt * this.WALK_CYCLE_SPEED);
    const isFootfall = (sinCycle <= 0 && prevSinCycle > 0) || (sinCycle >= 0 && prevSinCycle < 0);

    // Screen shake on every footfall
    if (isFootfall) {
      this.triggerCameraShake(6);
      // Dust cloud at foot position
      this.createStompDust(this.mainMegabot.position);
    }

    // Splash damage: core destroy, heavy ring, light ring
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const building = this.buildings[i];
      if (!building.active) continue;

      const dx = this.mainMegabot.position.x - building.group.position.x;
      const dz = this.mainMegabot.position.z - building.group.position.z;
      const distSq = dx * dx + dz * dz;

      // Core radius: instant destroy
      if (distSq < this.MEGABOT_STOMP_RADIUS * this.MEGABOT_STOMP_RADIUS) {
        this.destroyBuilding(building, i);
        this.triggerCameraShake(10);
      }
      // Heavy damage ring (only on footfall)
      else if (isFootfall && distSq < this.STOMP_HEAVY_RADIUS * this.STOMP_HEAVY_RADIUS) {
        building.health -= 2;
        building.damageLevel += 2;
        if (building.health <= 0) {
          this.destroyBuilding(building, i);
        } else {
          this.applyBuildingDamageVisuals(building);
        }
      }
      // Light damage ring (only on footfall)
      else if (isFootfall && distSq < this.STOMP_LIGHT_RADIUS * this.STOMP_LIGHT_RADIUS) {
        building.health -= 1;
        building.damageLevel += 1;
        if (building.health <= 0) {
          this.destroyBuilding(building, i);
        } else {
          this.applyBuildingDamageVisuals(building);
        }
      }
    }
  }

  // Trigger camera shake with given magnitude
  triggerCameraShake(magnitude: number) {
    this.cameraShakeMagnitude = Math.max(this.cameraShakeMagnitude, magnitude);
    this.cameraShakeDecay = 0.3; // 0.3s shake duration
  }

  // Create dust cloud particles at stomp position
  createStompDust(position: any) {
    const THREE = this.THREE;
    const dustCount = 20;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustVelocities: any[] = [];

    for (let i = 0; i < dustCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 30;
      dustPositions[i * 3] = position.x + Math.cos(angle) * radius;
      dustPositions[i * 3 + 1] = this.GROUND_Y + 5 + Math.random() * 10;
      dustPositions[i * 3 + 2] = position.z + Math.sin(angle) * radius;

      // Expand outward and upward
      const speed = 80 + Math.random() * 120;
      dustVelocities.push(new THREE.Vector3(
        Math.cos(angle) * speed,
        30 + Math.random() * 60,
        Math.sin(angle) * speed
      ));
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x998877,
      size: 12,
      transparent: true,
      opacity: 0.6,
    });
    const dustSystem = new THREE.Points(dustGeo, dustMat);
    this.scene.add(dustSystem);

    // Track as explosion for animation/cleanup
    this.explosions3D.push({
      particles: dustSystem,
      light: new THREE.PointLight(0x000000, 0, 0),
      velocities: dustVelocities,
      lifetime: 0,
      maxLifetime: 1.2,
      active: true,
    });
    this.scene.add(this.explosions3D[this.explosions3D.length - 1].light);
  }

  // Apply progressive damage visuals to a building based on its damageLevel
  applyBuildingDamageVisuals(building: any) {
    const damageRatio = building.damageLevel / building.maxHealth;

    // Tilt building based on damage
    if (damageRatio > 0.25) {
      const tiltAmount = Math.min(damageRatio, 1.0);
      // Light damage: subtle tilt (up to ~5°)
      const tiltScale = damageRatio > 0.75 ? 0.25 : damageRatio > 0.5 ? 0.14 : 0.06;
      building.group.rotation.x = building.damageTiltX * tiltScale;
      building.group.rotation.z = building.damageTiltZ * tiltScale;
    }

    // Shrink slightly
    const shrink = 1 - Math.min(damageRatio, 1.0) * 0.3;
    building.group.scale.y = shrink;

    // Darken windows progressively (only clone material once per window)
    if (building.windowMeshes) {
      const windowCount = building.windowMeshes.length;
      const darkCount = Math.floor(windowCount * Math.min(damageRatio * 1.2, 1.0));
      for (let i = 0; i < darkCount; i++) {
        const win = building.windowMeshes[i];
        if (win && !win._darkened) {
          win.material = win.material.clone();
          win.material.opacity = 0.1;
          win.material.color.setHex(0x111111);
          win._darkened = true;
        }
      }
    }

    // Assign smoke emitter for medium+ damage
    if (damageRatio > 0.4 && building.smokeEmitterIndex === -1) {
      this.assignSmokeEmitter(building);
    }
  }

  // Shield system: recharges after not taking damage
  updateShield(dt: number) {
    const timeSinceHit = this.time - this.lastDamageTime;
    if (timeSinceHit > this.SHIELD_RECHARGE_DELAY && this.shieldHP < this.MAX_SHIELD_HP) {
      this.shieldHP = Math.min(this.MAX_SHIELD_HP, this.shieldHP + this.SHIELD_RECHARGE_RATE * dt);
    }

    // Update shield visual
    if (this.shieldMesh && this.mainMegabot) {
      this.shieldMesh.position.copy(this.mainMegabot.position);
      this.shieldMesh.position.y += this.MAIN_SIZE * 0.3;

      const shieldRatio = this.shieldHP / this.MAX_SHIELD_HP;
      this.shieldMesh.material.opacity = shieldRatio * 0.15 + 0.02;
      this.shieldMesh.material.color.setHex(shieldRatio > 0.5 ? 0x4488ff : shieldRatio > 0.2 ? 0xffaa00 : 0xff4444);
      // Pulsing effect
      const pulse = 1.0 + Math.sin(this.time * 3) * 0.02;
      this.shieldMesh.scale.setScalar(pulse);
      this.shieldMesh.visible = this.shieldHP > 0;
    }
  }

  // Apply damage with shield absorption
  applyDamageToMegabot(damage: number) {
    this.lastDamageTime = this.time;

    if (this.shieldHP > 0) {
      const absorbed = Math.min(damage, this.shieldHP);
      this.shieldHP -= absorbed;
      damage -= absorbed;
    }

    if (damage > 0) {
      this.megabotHealth = Math.max(0, this.megabotHealth - damage);
    }
  }

  // Create the shield bubble visual
  createShieldBubble() {
    const THREE = this.THREE;
    const shieldGeo = new THREE.SphereGeometry(this.MAIN_SIZE * 1.3, 32, 32);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.position.y = this.MAIN_SIZE * 0.3;
    this.scene.add(this.shieldMesh);
  }

  // Check and apply weapon upgrades based on score
  checkUpgrades() {
    let newLevel = 0;
    for (let i = 0; i < this.UPGRADE_THRESHOLDS.length; i++) {
      if (this.gameScore >= this.UPGRADE_THRESHOLDS[i]) {
        newLevel = i + 1;
      }
    }
    this.upgradeLevel = newLevel;
  }

  // Missile barrage - fire missiles in all directions (Level 3 ability)
  launchMissileBarrage() {
    if (!this.mainMegabot) return;
    const THREE = this.THREE;

    const count = this.upgradeLevel >= 4 ? 12 : 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const launchPos = this.mainMegabot.position.clone();
      launchPos.y += this.MAIN_SIZE * 0.7;

      const targetPos = launchPos.clone().add(
        new THREE.Vector3(
          Math.cos(angle) * 1500,
          (Math.random() - 0.3) * 400,
          Math.sin(angle) * 1500
        )
      );

      setTimeout(() => {
        const missile = this.create3DMissile(launchPos.clone(), targetPos);
        // If upgrade level 1+, make missiles homing
        if (missile && this.upgradeLevel >= 1) {
          (missile as any).homing = true;
        }
      }, i * 40);
    }
  }

  // Wave system logic
  updateWaveSystem(dt: number) {
    const currentTime = this.time * 1000;

    switch (this.waveState) {
      case 'intermission':
        this.waveTimer += dt;
        if (this.waveTimer >= this.WAVE_INTERMISSION_TIME) {
          // Start next wave
          this.currentWave++;
          this.waveTimer = 0;

          const isBossWave = this.currentWave % this.BOSS_WAVE_INTERVAL === 0;
          this.waveState = isBossWave ? 'boss' : 'active';

          // Calculate ships for this wave
          if (isBossWave) {
            // Boss wave: fewer but tougher ships + a boss formation
            this.waveShipsRemaining = 3 + Math.floor(this.currentWave / 5);
            this.spawnBossWave();
          } else {
            // Normal wave: escalating ship count
            this.waveShipsRemaining = 4 + this.currentWave * 2;
          }
          this.waveShipsAlive = 0;
          this.lastShipSpawnTime = currentTime;
          this.lastFormationSpawnTime = currentTime;
        }
        break;

      case 'active':
      case 'boss': {
        // Spawn ships with increasing frequency per wave
        const spawnInterval = Math.max(800, this.SHIP_SPAWN_INTERVAL - this.currentWave * 100);
        if (this.waveShipsRemaining > 0 && currentTime - this.lastShipSpawnTime > spawnInterval) {
          this.spawn3DShip();
          this.waveShipsRemaining--;
          this.waveShipsAlive++;
          this.lastShipSpawnTime = currentTime;
        }

        // Spawn formations during waves
        const formInterval = Math.max(3000, this.FORMATION_SPAWN_INTERVAL - this.currentWave * 200);
        if (this.waveShipsRemaining > 3 && currentTime - this.lastFormationSpawnTime > formInterval) {
          this.spawnFormation();
          this.waveShipsRemaining -= 3;
          this.waveShipsAlive += 3;
          this.lastFormationSpawnTime = currentTime;
        }

        // Check if wave is complete (all spawned and all destroyed) - count directly to avoid GC
        let shipsLeft = 0;
        for (let si = 0; si < this.enemyShips.length; si++) {
          if (this.enemyShips[si].active) shipsLeft++;
        }
        if (this.waveShipsRemaining <= 0 && shipsLeft === 0) {
          this.waveState = 'intermission';
          this.waveTimer = 0;
          // Wave completion bonus
          this.gameScore += this.currentWave * 100;
        }
        break;
      }
    }
  }

  // Boss wave: spawn a large cruiser escort formation
  spawnBossWave() {
    const THREE = this.THREE;
    const bossFormId = this.formationIdCounter++;
    const baseAngle = Math.random() * Math.PI * 2;
    const bossPos = new THREE.Vector3(
      Math.cos(baseAngle) * this.SHIP_SPAWN_RADIUS,
      100 + Math.random() * 200,
      Math.sin(baseAngle) * this.SHIP_SPAWN_RADIUS
    );

    // Spawn boss cruiser
    const bossShip = this.create3DShipGeometry('cruiser');
    bossShip.group.position.copy(bossPos);
    bossShip.group.lookAt(this.megabotWorldPos.x, this.megabotWorldPos.y, this.megabotWorldPos.z);

    // Boss has scaled-up health based on wave
    const bossHealth = 15 + this.currentWave * 2;
    const dir = this._tmpVec3A.copy(this.megabotWorldPos).sub(bossPos).normalize();
    const speed = 120;

    this.enemyShips.push({
      ...bossShip,
      health: bossHealth,
      maxHealth: bossHealth,
      velocity: new THREE.Vector3(dir.x * speed, dir.y * speed, dir.z * speed),
      active: true,
      lastLaserTime: 0,
      formationId: bossFormId,
      formationRole: 'boss',
    });
    this.scene.add(bossShip.group);

    // Spawn 2-4 escort fighters
    const escortCount = 2 + Math.floor(this.currentWave / 5);
    for (let i = 0; i < escortCount; i++) {
      const escortAngle = baseAngle + ((i + 1) / (escortCount + 1)) * 0.6 - 0.3;
      const escortShip = this.create3DShipGeometry('fighter');
      escortShip.group.position.set(
        Math.cos(escortAngle) * this.SHIP_SPAWN_RADIUS,
        bossPos.y + (i % 2 === 0 ? 50 : -50),
        Math.sin(escortAngle) * this.SHIP_SPAWN_RADIUS
      );
      escortShip.group.lookAt(this.megabotWorldPos.x, this.megabotWorldPos.y, this.megabotWorldPos.z);

      const escortDir = this._tmpVec3B.copy(this.megabotWorldPos).sub(escortShip.group.position).normalize();
      this.enemyShips.push({
        ...escortShip,
        velocity: new THREE.Vector3(escortDir.x * 280, escortDir.y * 280, escortDir.z * 280),
        active: true,
        lastLaserTime: 0,
        formationId: bossFormId,
        behavior: 'escort-protect',
        escortTarget: bossFormId,
      });
      this.scene.add(escortShip.group);
    }
  }

  // Shared laser-vs-ship cone check. Returns true if ship was destroyed.
  _checkLaserHit(eye: any, laser: any, ship: any, coneThreshold: number, damagePerSec: number, dt: number): boolean {
    eye.getWorldPosition(this._tmpVec3C);
    this._tmpVec3D.subVectors(ship.group.position, this._tmpVec3C);
    const dist = this._tmpVec3D.length();
    if (dist >= this.ENEMY_LASER_RANGE) return false;

    this._tmpVec3E.set(0, 1, 0);
    this._tmpVec3E.applyQuaternion(laser.getWorldQuaternion(this._tmpQuat));
    this._tmpVec3D.normalize();
    const angle = this._tmpVec3E.dot(this._tmpVec3D);
    if (angle <= coneThreshold) return false;

    ship.health -= damagePerSec * dt;
    ship.hitFlash = 1.0;

    if (Math.random() > 0.8) {
      this.create3DExplosion(ship.group.position, ship.size * 0.5);
    }

    if (ship.health <= 0) {
      const scoreBonus = ship.type === 'cruiser' ? 500 : ship.type === 'bomber' ? 300 : ship.type === 'interceptor' ? 200 : 100;
      this.gameScore += scoreBonus;
      this.create3DExplosion(ship.group.position, ship.size * 2.5);
      return true;
    }
    return false;
  }

  // Update 3D combat system
  update3DCombat(deltaTime: number) {
    const THREE = this.THREE;
    const dt = deltaTime;

    // Process RAF-synced burst queue (replaces setTimeout for interceptor fire)
    this._processBurstQueue();

    // Wave-based spawning instead of constant
    this.updateWaveSystem(dt);

    // Pre-compute per-frame invariants (hoisted outside ship loop)
    const currentTimeMs = this.time * 1000;
    const enginePulse = 0.7 + Math.sin(this.time * 10) * 0.2;
    const interceptorWobble = Math.sin(this.time * 4) * 0.2;
    const cruiserPitch = Math.sin(this.time * 0.5) * 0.05;
    const bomberPitch = Math.sin(this.time * 0.8) * 0.02;
    const laserConeThreshold = this.upgradeLevel >= 2 ? 0.82 : 0.92;
    const laserDamagePerSec = this.upgradeLevel >= 4 ? 10 : 5;
    const weaponRangeSq = this.ENEMY_LASER_RANGE * this.ENEMY_LASER_RANGE;
    const despawnDistSq = (this.SHIP_SPAWN_RADIUS * 2) * (this.SHIP_SPAWN_RADIUS * 2);

    // Update enemy ships
    for (let i = this.enemyShips.length - 1; i >= 0; i--) {
      const ship = this.enemyShips[i];
      if (!ship.active) continue;

      const distToMegabotSq = ship.group.position.distanceToSquared(this.megabotWorldPos);

      // Behavior functions need actual distance — only sqrt when needed
      const distToMegabot = (ship.behavior === 'orbit-strafe' || ship.behavior === 'pincer-attack')
        ? Math.sqrt(distToMegabotSq)
        : 0; // unused for other behaviors

      // Update position based on behavior type
      if (ship.behavior === 'orbit-strafe') {
        this.updateOrbitStrafeBehavior(ship, dt, distToMegabot);
      } else if (ship.behavior === 'pincer-attack') {
        this.updatePincerBehavior(ship, dt, distToMegabot);
      } else if (ship.behavior === 'escort-protect') {
        this.updateEscortBehavior(ship, dt);
      } else {
        ship.group.position.x += ship.velocity.x * dt;
        ship.group.position.y += ship.velocity.y * dt;
        ship.group.position.z += ship.velocity.z * dt;
      }

      // Face direction of travel (or Megabot), then add characteristic secondary motion
      // Only apply lookAt for non-formation ships (formations handle their own facing)
      if (!ship.behavior || ship.behavior === 'formation-attack') {
        // Face toward Megabot
        ship.group.lookAt(this.megabotWorldPos.x, this.megabotWorldPos.y, this.megabotWorldPos.z);
      }
      // Add type-specific secondary motion on top of facing direction
      if (ship.type === 'fighter') {
        // Fighters: banking roll during flight
        ship.group.rotateZ(Math.sin(this.time * 4 + i) * 0.03);
      } else if (ship.type === 'interceptor') {
        // Interceptors: aggressive wobble
        ship.group.rotateZ(interceptorWobble * 0.15);
      } else if (ship.type === 'bomber') {
        // Bombers: slow, steady — gentle pitch oscillation
        ship.group.rotateX(bomberPitch);
      } else if (ship.type === 'cruiser') {
        // Cruisers: majestic slow roll
        ship.group.rotateX(cruiserPitch * 0.5);
      }

      // Animate engine glows (pulsing effect) - uses cached engine refs instead of forEach
      if (ship._engineChildren) {
        for (let e = 0; e < ship._engineChildren.length; e++) {
          ship._engineChildren[e].material.opacity = enginePulse;
        }
      }

      // Enhanced damage visual feedback - uses cached emissive refs instead of forEach
      if (ship.hitFlash > 0) {
        ship.hitFlash -= dt * 3;
        if (ship.hitFlash < 0) ship.hitFlash = 0;

        if (ship._emissiveChildren) {
          for (let e = 0; e < ship._emissiveChildren.length; e++) {
            const child = ship._emissiveChildren[e];
            child.material.emissiveIntensity = 0.3 + ship.hitFlash * 1.5;
            if (ship.hitFlash > 0.8) {
              child.material.emissive.copy(this._colorWhite);
            } else if (ship.hitFlash > 0.3) {
              child.material.emissive.copy(this._colorOrangeDmg);
            }
          }
        }
      }

      // Show damage state based on health percentage
      const healthPercent = ship.health / ship.maxHealth;
      if (ship.group.children.length > 0) {
        const hullChild = ship.group.children[0] as any;
        if (hullChild.material) {
          // Smoke/damage effect at low health
          if (healthPercent < 0.3) {
            hullChild.material.emissiveIntensity = Math.max(hullChild.material.emissiveIntensity || 0.3, 0.5 + Math.random() * 0.3);
            // Flickering damage at critical health
            if (Math.random() > 0.7) {
              hullChild.material.emissive.copy(this._colorRedDmg);
            }
          } else if (healthPercent < 0.6) {
            // Moderate damage - slight smoke
            if (Math.random() > 0.9) {
              hullChild.material.emissive.copy(this._colorOrangeFlicker);
            }
          }
        }
      }

      // Ship weapon firing logic (distToMegabot already calculated above)
      // Different weapons and cooldowns based on ship type and behavior
      let weaponCooldown = 2000; // Default cooldown in ms
      let weaponRange = this.ENEMY_LASER_RANGE;

      if (ship.type === 'fighter') {
        weaponCooldown = 1500; // Fighters shoot faster
      } else if (ship.type === 'interceptor') {
        weaponCooldown = 600; // Interceptors fire rapid bursts more often
      } else if (ship.type === 'bomber') {
        weaponCooldown = 3500; // Bombers charge plasma cannon slowly
        weaponRange = this.ENEMY_LASER_RANGE * 1.2; // Longer range for plasma
      } else if (ship.type === 'cruiser') {
        weaponCooldown = 1200; // Cruisers fire broadsides regularly
        weaponRange = this.ENEMY_LASER_RANGE * 1.5; // Long range capital ship
      }

      // Formation-specific behavior modifiers
      if (ship.behavior === 'orbit-strafe' && ship.orbitPhase === 'strafe') {
        weaponCooldown *= 0.5; // Fire faster during strafe runs
      } else if (ship.behavior === 'pincer-attack' && ship.pincerPhase === 'strafe') {
        weaponCooldown *= 0.6; // Aggressive fire during pincer strafe
      } else if (ship.behavior === 'escort-protect') {
        weaponCooldown *= 0.8; // Escorts are vigilant
      }

      const weaponRangeSqScaled = weaponRange * weaponRange;
      if (distToMegabotSq < weaponRangeSqScaled &&
          currentTimeMs - ship.lastLaserTime > weaponCooldown) {

        // Fire appropriate weapon based on ship type
        if (ship.type === 'interceptor') {
          // Interceptors fire rapid laser bursts
          this.fireRapidBurst(ship);
        } else if (ship.type === 'bomber') {
          // Bombers fire slow but devastating plasma cannons
          this.createPlasmaCannon(ship);
        } else if (ship.type === 'cruiser') {
          // Cruisers fire broadside: plasma + standard lasers
          this.createPlasmaCannon(ship);
          this.createEnemyLaser(ship);
        } else {
          // Fighters use standard lasers
          this.createEnemyLaser(ship);
        }

        ship.lastLaserTime = currentTimeMs;
      }

      // Check collision with megabot (squared distance)
      const megabotHitRadius = this.MAIN_SIZE + ship.size;
      if (distToMegabotSq < megabotHitRadius * megabotHitRadius) {
        // Hit megabot - apply damage through shield and score penalty
        this.applyDamageToMegabot(10);
        this.gameScore = Math.max(0, this.gameScore - 5);
        this.create3DExplosion(ship.group.position, ship.size * 2);
        this.scene.remove(ship.group);
        this.enemyShips.splice(i, 1);
        continue;
      }

      // Check collision with lasers (ray-cone intersection) - shared helper, hoisted thresholds
      if (this.leftLaser && this.rightLaser && this.leftLaser.visible) {
        if (this._checkLaserHit(this.leftEye, this.leftLaser, ship, laserConeThreshold, laserDamagePerSec, dt)) {
          this.scene.remove(ship.group);
          this.enemyShips.splice(i, 1);
          continue;
        }
        if (this._checkLaserHit(this.rightEye, this.rightLaser, ship, laserConeThreshold, laserDamagePerSec, dt)) {
          this.scene.remove(ship.group);
          this.enemyShips.splice(i, 1);
          continue;
        }
      }

      // Remove if too far (squared distance)
      if (distToMegabotSq > despawnDistSq) {
        this.scene.remove(ship.group);
        this.enemyShips.splice(i, 1);
      }
    }

    // Update missiles
    for (let i = this.missiles3D.length - 1; i >= 0; i--) {
      const missile = this.missiles3D[i];
      if (!missile.active) continue;

      // Homing missile logic (upgrade level 1+) - cached target avoids O(M×S) scan
      if ((missile as any).homing && this.enemyShips.length > 0) {
        // Re-acquire target only when needed (dead, inactive, or no target)
        let target = (missile as any)._homingTarget;
        if (!target || !target.active || target.health <= 0) {
          let nearestDist = Infinity;
          target = null;
          for (let s = 0; s < this.enemyShips.length; s++) {
            const ship = this.enemyShips[s];
            if (!ship.active) continue;
            const d = missile.group.position.distanceToSquared(ship.group.position);
            if (d < nearestDist) {
              nearestDist = d;
              target = ship;
            }
          }
          (missile as any)._homingTarget = target;
        }
        if (target) {
          // Steer toward cached target
          const toTarget = this._tmpVec3A.subVectors(target.group.position, missile.group.position).normalize();
          const currentDir = this._tmpVec3B.copy(missile.velocity).normalize();
          const homingStrength = this.upgradeLevel >= 4 ? 0.06 : 0.03;
          missile.velocity.x += (toTarget.x - currentDir.x) * this.MISSILE_SPEED_3D * homingStrength;
          missile.velocity.y += (toTarget.y - currentDir.y) * this.MISSILE_SPEED_3D * homingStrength;
          missile.velocity.z += (toTarget.z - currentDir.z) * this.MISSILE_SPEED_3D * homingStrength;
          missile.velocity.normalize().multiplyScalar(this.MISSILE_SPEED_3D);
          missile.group.lookAt(target.group.position);
        }
      }

      // Update position
      missile.group.position.x += missile.velocity.x * dt;
      missile.group.position.y += missile.velocity.y * dt;
      missile.group.position.z += missile.velocity.z * dt;

      // Non-homing missiles should face their velocity direction
      if (!(missile as any).homing) {
        const ahead = this._tmpVec3C.copy(missile.group.position).add(missile.velocity);
        missile.group.lookAt(ahead);
      }

      // Pulsing exhaust glow on all missiles
      const exhaustChild = missile.group.children[3]; // exhaust sphere
      if (exhaustChild && exhaustChild.material) {
        exhaustChild.material.opacity = 0.5 + Math.sin(this.time * 15) * 0.3;
      }

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

        if (this.check3DCollision(missile.group.position, 15, ship.group.position, ship.size)) {
          ship.health--;
          ship.hitFlash = 1.0;
          hitShip = true;

          if (ship.health <= 0) {
            // Score based on ship type (same as laser kills)
            const scoreBonus = ship.type === 'cruiser' ? 500 : ship.type === 'bomber' ? 300 : ship.type === 'interceptor' ? 200 : 100;
            this.gameScore += scoreBonus;
            this.create3DExplosion(ship.group.position, ship.size * 2.5);
            this.scene.remove(ship.group);
            this.enemyShips.splice(j, 1);
          } else {
            // Hit but not destroyed - small spark
            this.create3DExplosion(missile.group.position, 15);
          }

          this.scene.remove(missile.group);
          this.missiles3D.splice(i, 1);
          break;
        }
      }

      if (hitShip) continue;

      // Remove if out of range
      if (missile.group.position.distanceToSquared(this.megabotWorldPos) > 16000000) { // 4000^2
        this.scene.remove(missile.group);
        this.missiles3D.splice(i, 1);
      }
    }

    // Update enemy lasers/projectiles
    for (let i = this.enemyLasers.length - 1; i >= 0; i--) {
      const laser = this.enemyLasers[i];
      if (!laser.active) continue;

      laser.lifetime += dt;

      // Update position
      laser.group.position.x += laser.velocity.x * dt;
      laser.group.position.y += laser.velocity.y * dt;
      laser.group.position.z += laser.velocity.z * dt;

      // Different visual effects based on projectile type
      if (laser.type === 'plasma') {
        // Plasma cannon pulsing effect
        laser.pulsePhase = (laser.pulsePhase || 0) + dt * 8;
        const pulseScale = 1 + Math.sin(laser.pulsePhase) * 0.2;
        laser.group.scale.setScalar(pulseScale);

        // Rotate plasma ball
        laser.group.rotation.y += dt * 3;
        laser.group.rotation.x += dt * 2;

        // Update point light intensity (for loop instead of forEach)
        const plasmaChildren = laser.group.children;
        for (let c = 0; c < plasmaChildren.length; c++) {
          if (plasmaChildren[c].isPointLight) {
            plasmaChildren[c].intensity = 2 + Math.sin(laser.pulsePhase * 2) * 1;
          }
        }
      } else if (laser.type === 'rapid') {
        // Rapid laser streaking effect - slight trail
        laser.group.scale.z = 1 + laser.lifetime * 2; // Stretch as it flies
      } else {
        // Standard laser fade out over lifetime
        const fadeProgress = laser.lifetime / laser.maxLifetime;
        const laserChildren = laser.group.children;
        for (let c = 0; c < laserChildren.length; c++) {
          const child = laserChildren[c] as any;
          if (child.material && child.material.transparent) {
            child.material.opacity = (1 - fadeProgress) * 0.9;
          }
        }
      }

      // Check if laser hit megabot (sphere collision) - squared distance avoids sqrt
      const distToMegabotSq = laser.group.position.distanceToSquared(this.megabotWorldPos);
      const hitRadius = laser.type === 'plasma' ? this.MAIN_SIZE * 1.2 : this.MAIN_SIZE;

      if (distToMegabotSq < hitRadius * hitRadius) {
        // Hit megabot! (through shield)
        this.applyDamageToMegabot(laser.damage);

        // Different explosion sizes based on weapon type
        const explosionSize = laser.type === 'plasma' ? 40 : laser.type === 'rapid' ? 8 : 15;
        this.create3DExplosion(laser.group.position, explosionSize);

        this.scene.remove(laser.group);
        this.enemyLasers.splice(i, 1);
        continue;
      }

      // Remove if expired or out of range
      if (laser.lifetime >= laser.maxLifetime || distToMegabotSq > this._despawnRadiusSq) {
        this.scene.remove(laser.group);
        this.enemyLasers.splice(i, 1);
      }
    }

    // Update explosions
    for (let i = this.explosions3D.length - 1; i >= 0; i--) {
      const explosion = this.explosions3D[i];
      if (!explosion.active) continue;

      explosion.lifetime += dt;

      if (explosion.lifetime >= explosion.maxLifetime) {
        // Return pooled explosions to pool instead of removing from scene
        explosion.active = false;
        explosion.particles.visible = false;
        explosion.light.visible = false;
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

    // Update destructible city buildings
    this.updateBuildings(dt);

    // Update collapsing buildings, debris chunks, and smoke
    this.updateCollapsingBuildings(dt);
    this.updateDebrisChunks(dt);
    this.updateSmokeEmitters(dt);

    // Update game state callback - only fire when values actually change to avoid React re-renders
    if (this.onGameStateUpdate) {
      let activeShips = 0;
      for (let i = 0; i < this.enemyShips.length; i++) {
        if (this.enemyShips[i].active) activeShips++;
      }
      let activeMissiles = 0;
      for (let i = 0; i < this.missiles3D.length; i++) {
        if (this.missiles3D[i].active) activeMissiles++;
      }
      const flooredShield = Math.floor(this.shieldHP);
      if (this.gameScore !== this._prevScore ||
          this.megabotHealth !== this._prevHealth ||
          activeShips !== this._prevShipCount ||
          activeMissiles !== this._prevMissileCount ||
          this.currentWave !== this._prevWave ||
          this.waveState !== this._prevWaveState ||
          flooredShield !== this._prevShieldHP ||
          this.upgradeLevel !== this._prevUpgradeLevel) {
        this._prevScore = this.gameScore;
        this._prevHealth = this.megabotHealth;
        this._prevShipCount = activeShips;
        this._prevMissileCount = activeMissiles;
        this._prevWave = this.currentWave;
        this._prevWaveState = this.waveState;
        this._prevShieldHP = flooredShield;
        this._prevUpgradeLevel = this.upgradeLevel;
        this.onGameStateUpdate({
          score: this.gameScore,
          health: this.megabotHealth,
          shipCount: activeShips,
          missileCount: activeMissiles,
          wave: this.currentWave,
          waveState: this.waveState,
          shieldHP: flooredShield,
          maxShieldHP: this.MAX_SHIELD_HP,
          upgradeLevel: this.upgradeLevel,
        });
      }
    }
  }

  addEventListeners() {
    // ── Mouse movement: subtle parallax + orbit/pan drag ──
    this._boundMouseMove = (e: MouseEvent) => {
      // Always track normalized mouse for subtle parallax
      this.mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;

      // Right-click drag → orbit camera
      if (this._isDragging) {
        const dx = e.clientX - this._dragStartX;
        const dy = e.clientY - this._dragStartY;
        this._dragTotalDist += Math.abs(dx) + Math.abs(dy);

        this.cameraYaw -= dx * this.CAMERA_ORBIT_SPEED;
        this.cameraPitch += dy * this.CAMERA_ORBIT_SPEED;
        // Clamp pitch
        this.cameraPitch = Math.max(this.CAMERA_MIN_PITCH, Math.min(this.CAMERA_MAX_PITCH, this.cameraPitch));

        this._dragStartX = e.clientX;
        this._dragStartY = e.clientY;
        return;
      }

      // Middle-click drag → pan camera
      if (this._isPanning) {
        const dx = e.clientX - this._dragStartX;
        const dy = e.clientY - this._dragStartY;
        this._dragTotalDist += Math.abs(dx) + Math.abs(dy);

        // Pan in camera-local XY plane
        const panScale = this.cameraDistance * this.CAMERA_PAN_SPEED * 0.001;
        // Horizontal pan is perpendicular to camera yaw
        this.cameraPanX -= dx * panScale * Math.cos(this.cameraYaw);
        this.cameraPanZ += dx * panScale * Math.sin(this.cameraYaw);
        // Vertical pan is always world-Y
        this.cameraPanY += dy * panScale;

        this._dragStartX = e.clientX;
        this._dragStartY = e.clientY;
        return;
      }
    };
    document.addEventListener("mousemove", this._boundMouseMove);

    // ── Mouse down: start orbit drag (right) or pan drag (middle) ──
    this._boundMouseDown = (e: MouseEvent) => {
      const rect = this.container.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top  || e.clientY > rect.bottom) return;

      if (e.button === 2) {
        // Right-click: orbit
        this._isDragging = true;
        this._dragStartX = e.clientX;
        this._dragStartY = e.clientY;
        this._dragTotalDist = 0;
        e.preventDefault();
      } else if (e.button === 1) {
        // Middle-click: pan
        this._isPanning = true;
        this._dragStartX = e.clientX;
        this._dragStartY = e.clientY;
        this._dragTotalDist = 0;
        e.preventDefault();
      }
    };
    document.addEventListener("mousedown", this._boundMouseDown);

    // ── Mouse up: end drag ──
    this._boundMouseUp = (e: MouseEvent) => {
      if (e.button === 2) this._isDragging = false;
      if (e.button === 1) this._isPanning = false;
    };
    document.addEventListener("mouseup", this._boundMouseUp);

    // ── Context menu: suppress on canvas so right-click drag works ──
    this._boundContextMenu = (e: Event) => {
      const rect = this.container.getBoundingClientRect();
      const me = e as MouseEvent;
      if (me.clientX >= rect.left && me.clientX <= rect.right &&
          me.clientY >= rect.top  && me.clientY <= rect.bottom) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", this._boundContextMenu);

    // ── Scroll wheel: zoom in/out ──
    this._boundWheel = (e: WheelEvent) => {
      const rect = this.container.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top  || e.clientY > rect.bottom) return;

      // Zoom speed scales with distance (feels natural at all zoom levels)
      const zoomFactor = 1 + (e.deltaY > 0 ? 0.1 : -0.1);
      this.cameraTargetDistance = Math.max(
        this.CAMERA_MIN_DISTANCE,
        Math.min(this.CAMERA_MAX_DISTANCE, this.cameraTargetDistance * zoomFactor)
      );
      e.preventDefault();
    };
    document.addEventListener("wheel", this._boundWheel, { passive: false });

    // ── Click: fire missiles (left-click only, not during drag) ──
    // The hero content overlay (z-10) sits above the canvas (z-0), so clicks
    // on the container never fire. Instead we listen globally and bounds-check.
    this._boundClick = (e: MouseEvent) => {
      // Only left-click fires missiles
      if (e.button !== 0) return;

      const rect = this.container.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top  || e.clientY > rect.bottom) return;

      // Ignore clicks on interactive elements (links, buttons) so they still work
      const target = e.target as HTMLElement;
      if (target.closest('a, button, [role="button"], input, select, textarea')) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (e.shiftKey) {
        this.launchClusterMissiles({ x, y });
      } else {
        this.launch3DMissileFromMegabot({ x, y });
      }
    };
    document.addEventListener("click", this._boundClick);

    // ── Keyboard: WASD movement, Q barrage, R reset camera, F focus ──
    this._boundKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      // Game movement + camera keys
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q', 'e', 'x', 'r', 'f'].includes(key)) {
        e.preventDefault();
        this.keysPressed.add(key);

        // Camera reset (R) - snap back to default orbit
        if (key === 'r') {
          this.cameraYaw = 0;
          this.cameraPitch = 0.35;
          this.cameraTargetDistance = 1200;
          this.cameraPanX = 0;
          this.cameraPanY = 0;
          this.cameraPanZ = 0;
        }
        // Focus on megabot (F) - clear pan offset
        if (key === 'f') {
          this.cameraPanX = 0;
          this.cameraPanY = 0;
          this.cameraPanZ = 0;
        }
      }
    };
    this._boundKeyUp = (e: KeyboardEvent) => {
      this.keysPressed.delete(e.key.toLowerCase());
    };
    document.addEventListener("keydown", this._boundKeyDown);
    document.addEventListener("keyup", this._boundKeyUp);

    // ── Window resize ──
    this._boundResize = () => this.onWindowResize();
    window.addEventListener("resize", this._boundResize, false);
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

    // Use real elapsed time instead of fixed 0.016 to prevent stuttering
    const now = performance.now();
    const rawDelta = this.lastFrameTime > 0 ? (now - this.lastFrameTime) / 1000 : 0.016;
    this.lastFrameTime = now;
    // Cap deltaTime to prevent spiral of death on tab-switch or lag spikes
    const deltaTime = Math.min(rawDelta, 0.05);
    this.time += deltaTime;

    // WASD / Arrow key movement
    this.updateMegabotMovement(deltaTime);

    // Update 3D combat system (wave-based)
    this.update3DCombat(deltaTime);

    // Update shield recharge
    this.updateShield(deltaTime);

    // Check weapon upgrades
    this.checkUpgrades();

    // Update barrage cooldown
    if (this.barrageCooldown > 0) this.barrageCooldown -= deltaTime;

    // Handle Q key for missile barrage
    if (this.keysPressed.has('x') && this.upgradeLevel >= 3 && this.barrageCooldown <= 0) {
      this.launchMissileBarrage();
      this.barrageCooldown = this.BARRAGE_COOLDOWN_TIME;
    }

    // Godmode 3D camera: spherical coords (yaw, pitch, distance) with pan offsets
    const megaPos = this.mainMegabot ? this.mainMegabot.position : this._tmpVec3A.set(0, this.MEGABOT_STAND_Y, 0);

    // Smooth zoom interpolation
    this.cameraDistance += (this.cameraTargetDistance - this.cameraDistance) * this.CAMERA_ZOOM_SMOOTH;

    // Look-at target = megabot position + pan offsets
    const lookAtX = megaPos.x + this.cameraPanX;
    const lookAtY = megaPos.y * 0.45 + this.GROUND_Y * 0.55 + this.cameraPanY;
    const lookAtZ = megaPos.z + this.cameraPanZ;

    // Spherical coordinates: camera orbits around the look-at target
    const cosPitch = Math.cos(this.cameraPitch);
    this.camera.position.x = lookAtX + this.cameraDistance * cosPitch * Math.sin(this.cameraYaw);
    this.camera.position.y = lookAtY + this.cameraDistance * Math.sin(this.cameraPitch);
    this.camera.position.z = lookAtZ + this.cameraDistance * cosPitch * Math.cos(this.cameraYaw);

    // Apply camera shake
    if (this.cameraShakeDecay > 0) {
      const shakeIntensity = this.cameraShakeMagnitude * (this.cameraShakeDecay / 0.3);
      this.camera.position.x += (Math.random() - 0.5) * shakeIntensity * 2;
      this.camera.position.y += (Math.random() - 0.5) * shakeIntensity * 2;
      this.camera.position.z += (Math.random() - 0.5) * shakeIntensity * 2;
      this.cameraShakeDecay -= deltaTime;
      if (this.cameraShakeDecay <= 0) {
        this.cameraShakeMagnitude = 0;
      }
    }

    this.camera.lookAt(lookAtX, lookAtY, lookAtZ);

    // Animate main Megabot
    if (this.mainMegabot) {
      // Cache world pos for combat checks
      this.megabotWorldPos.copy(this.mainMegabot.position);

      // Body rotation - track target, Q/E manual, or idle hold
      // Always sync currentRotation.y from actual rotation so tracking/idle don't clobber Q/E
      if (this.trackingTarget && this.targetPosition3D) {
        // TRACKING MODE: EVIL AI body turns aggressively to face the target!
        // Blend toward target rotation, but start from the actual current rotation
        const lerpSpeed = 0.14;
        const angleDiff = this.targetRotation.y - this.mainMegabot.rotation.y;
        const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        this.mainMegabot.rotation.y += normalizedDiff * lerpSpeed;
        this.currentRotation.y = this.mainMegabot.rotation.y;
      } else if (!this.isWalking) {
        // IDLE MODE: Hold current facing direction (Q/E or last walk direction)
        // Smoothly decay head tracking offsets back to neutral
        const returnSpeed = 0.05;
        this.currentRotation.x += (0 - this.currentRotation.x) * returnSpeed;
        // Sync currentRotation from actual rotation (keeps Q/E changes)
        this.currentRotation.y = this.mainMegabot.rotation.y;
      } else {
        // WALKING: sync currentRotation from movement-set rotation
        this.currentRotation.y = this.mainMegabot.rotation.y;
      }

      // Pre-compute trig values used across multiple parts (hoisted out of forEach)
      const sinT4 = Math.sin(this.time * 4.0);   // eye glow pulsing
      const sinT3 = Math.sin(this.time * 3.0);   // laser beam pulsing
      const sinT1_5 = Math.sin(this.time * 1.5); // torso breathing
      const sinT0_3 = Math.sin(this.time * 0.3); // head scan Y
      const sinT0_5 = Math.sin(this.time * 0.5); // head scan X
      const sinT0_6 = Math.sin(this.time * 0.6); // idle arm X rotation

      // Animate individual parts
      this.megabotParts.forEach((part) => {
        // Animate evil laser eyes - FASTER and MORE INTENSE
        if (part.type === 'leftEye' || part.type === 'rightEye') {
          if (part.mesh.material.uniforms) {
            part.mesh.material.uniforms.time.value = this.time;
            const intensity = 5.0 + sinT4 * 2.0;
            part.mesh.material.uniforms.glowIntensity.value = intensity;
          }
        }

        // Animate laser beams with 3D raytracing
        if (part.type === 'leftLaser' || part.type === 'rightLaser') {
          if (part.mesh.material.uniforms) {
            part.mesh.material.uniforms.time.value = this.time;
            const baseIntensity = this.trackingTarget ? 3.5 : 2.0;
            const intensity = baseIntensity + sinT3 * 0.5;
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

            // Intensify eye glow when tracking - ULTRA EVIL LOCK-ON (direct access, no forEach)
            if (this.leftEye?.material?.uniforms) {
              this.leftEye.material.uniforms.glowIntensity.value = 10.0;
            }
            if (this.rightEye?.material?.uniforms) {
              this.rightEye.material.uniforms.glowIntensity.value = 10.0;
            }
          } else {
            // IDLE MODE: Default menacing scan when not tracking
            const scanY = sinT0_3 * 0.2;
            const scanX = sinT0_5 * 0.1;

            const returnSpeed = 0.08;
            this.currentRotation.x += (scanX - this.currentRotation.x) * returnSpeed;
            this.currentRotation.y += (scanY - this.currentRotation.y) * returnSpeed;

            part.mesh.rotation.y = this.currentRotation.y;
            part.mesh.rotation.x = this.currentRotation.x;
          }
        }

        // Torso breathing effect + walk sway
        if (part.type === 'torso') {
          const breathe = 1.0 + sinT1_5 * 0.02;
          part.mesh.scale.set(breathe, 1.0 + sinT1_5 * 0.01, breathe);
          if (this.isWalking) {
            // Subtle shoulder sway during walk (shifts weight side to side)
            const swayTarget = Math.sin(this.walkCycle) * 0.05;
            part.mesh.rotation.z += (swayTarget - part.mesh.rotation.z) * 0.15;
            // Forward lean (~5° when walking)
            part.mesh.rotation.x += (0.085 - part.mesh.rotation.x) * 0.12;
          } else {
            part.mesh.rotation.z *= 0.95; // Return to neutral
            part.mesh.rotation.x *= 0.95;
          }
        }

        // Arms movement - walk swing or idle sway
        if (part.type === 'arm') {
          if (this.isWalking) {
            // Walking: arms swing opposite to legs (left arm back when left leg forward)
            const armPhase = part.side === -1 ? Math.PI : 0;
            const targetX = Math.sin(this.walkCycle + armPhase) * this.ARM_SWING_ANGLE;
            part.mesh.rotation.x += (targetX - part.mesh.rotation.x) * 0.2;
            part.mesh.rotation.z = part.side * 0.08;
          } else {
            // Idle: subtle menacing sway
            const sway = Math.sin(this.time * 0.8 + part.side) * 0.05;
            part.mesh.rotation.z = part.side * 0.1 + sway;
            const idleX = sinT0_6 * 0.08;
            part.mesh.rotation.x += (idleX - part.mesh.rotation.x) * 0.1;
          }
        }

        // Legs - walking stride or idle stance
        if (part.type === 'leg') {
          if (this.isWalking) {
            // Walking: alternating stride - left and right legs swap
            const legPhase = part.side === -1 ? 0 : Math.PI;
            const targetX = Math.sin(this.walkCycle + legPhase) * this.STRIDE_ANGLE;
            part.mesh.rotation.x += (targetX - part.mesh.rotation.x) * 0.25;
          } else {
            // Idle: subtle weight shift, smoothly return to neutral
            const stance = Math.sin(this.time * 0.7 + part.side) * 0.02;
            part.mesh.rotation.x += (stance - part.mesh.rotation.x) * 0.08;
          }
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

      const particleLen = positions.length / 3;
      for (let i = 0; i < particleLen; i++) {
        const i3 = i * 3;
        // Apply velocities
        positions[i3] += velocities[i][0];
        positions[i3 + 1] += velocities[i][1];
        positions[i3 + 2] += velocities[i][2];

        // Attraction to center - use distSq to avoid sqrt (only need sqrt for normalization)
        const x = positions[i3];
        const y = positions[i3 + 1];
        const z = positions[i3 + 2];
        const distSq = x * x + y * y + z * z;

        if (distSq > this._particleContainDistSq) {
          // Only compute sqrt when we actually need the normalized direction
          const invDist = 1 / Math.sqrt(distSq);
          velocities[i][0] -= x * invDist * 0.01;
          velocities[i][1] -= y * invDist * 0.01;
          velocities[i][2] -= z * invDist * 0.01;
        }

        // Orbital motion
        velocities[i][0] += -y * 0.005;
        velocities[i][1] += x * 0.005;

        // Damping
        velocities[i][0] *= 0.99;
        velocities[i][1] *= 0.99;
        velocities[i][2] *= 0.99;

        // Respawn if too far (squared comparison avoids sqrt)
        if (distSq > this._particleRespawnDistSq) {
          const radius = this.MAIN_SIZE * (1 + Math.random() * 2);
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;

          const sinPhi = Math.sin(phi);
          positions[i3] = radius * sinPhi * Math.cos(theta);
          positions[i3 + 1] = radius * sinPhi * Math.sin(theta);
          positions[i3 + 2] = radius * Math.cos(phi);

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

    // Update blast particles - in-place splice instead of .filter() to avoid array allocation
    if (this.blastParticles.length > 0) {
      for (let i = this.blastParticles.length - 1; i >= 0; i--) {
        const blast = this.blastParticles[i];
        blast.age += deltaTime;

        if (blast.age >= blast.maxAge) {
          // Remove expired blast
          if (this.scene) this.scene.remove(blast.system);
          if (blast.system.geometry) blast.system.geometry.dispose();
          if (blast.system.material) blast.system.material.dispose();
          this.blastParticles.splice(i, 1);
          continue;
        }

        // Update particle positions
        const positions = blast.system.geometry.attributes.position.array as Float32Array;
        for (let j = 0; j < positions.length / 3; j++) {
          positions[j * 3] += blast.velocities[j * 3];
          positions[j * 3 + 1] += blast.velocities[j * 3 + 1];
          positions[j * 3 + 2] += blast.velocities[j * 3 + 2];

          // Apply gravity
          blast.velocities[j * 3 + 1] -= 0.5;

          // Damping
          blast.velocities[j * 3] *= 0.98;
          blast.velocities[j * 3 + 1] *= 0.98;
          blast.velocities[j * 3 + 2] *= 0.98;
        }
        blast.system.geometry.attributes.position.needsUpdate = true;

        // Fade out
        const fadeProgress = blast.age / blast.maxAge;
        blast.system.material.opacity = 1.0 - fadeProgress;
      }

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

    // Update existing spark particles - in-place splice instead of .filter()
    if (this.sparkParticles.length > 0) {
      for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
        const spark = this.sparkParticles[i];
        spark.age += deltaTime;

        if (spark.age >= spark.maxAge) {
          // Remove expired sparks
          if (this.scene) this.scene.remove(spark.system);
          if (spark.system.geometry) spark.system.geometry.dispose();
          if (spark.system.material) spark.system.material.dispose();
          this.sparkParticles.splice(i, 1);
          continue;
        }

        // Update particle positions
        const positions = spark.system.geometry.attributes.position.array as Float32Array;
        for (let j = 0; j < positions.length / 3; j++) {
          positions[j * 3] += spark.velocities[j * 3];
          positions[j * 3 + 1] += spark.velocities[j * 3 + 1];
          positions[j * 3 + 2] += spark.velocities[j * 3 + 2];

          // Apply gravity to sparks
          spark.velocities[j * 3 + 1] -= 0.8;

          // Air resistance
          spark.velocities[j * 3] *= 0.95;
          spark.velocities[j * 3 + 1] *= 0.95;
          spark.velocities[j * 3 + 2] *= 0.95;
        }
        spark.system.geometry.attributes.position.needsUpdate = true;

        // Fade out
        const fadeProgress = spark.age / spark.maxAge;
        spark.system.material.opacity = 1.0 - fadeProgress;
      }
    }

    // Update laser raycasting to target the button
    if (this.leftLaser && this.rightLaser && this.leftEye && this.rightEye && this.headGroup) {
      const THREE = this.THREE;

      if (this.trackingTarget && this.targetPosition3D) {
        // TRACKING MODE: Aim lasers at button - ZERO allocations (all pre-allocated)
        this.leftLaser.visible = true;
        this.rightLaser.visible = true;

        // Get world positions of the eyes into pre-allocated vectors
        this.leftEye.getWorldPosition(this._tmpVec3A);  // leftEyeWorldPos
        this.rightEye.getWorldPosition(this._tmpVec3B);  // rightEyeWorldPos

        // Calculate direction from each eye to target (reuse C, D)
        this._tmpVec3C.subVectors(this.targetPosition3D, this._tmpVec3A); // leftDirection
        this._tmpVec3D.subVectors(this.targetPosition3D, this._tmpVec3B); // rightDirection

        // Get distances before normalizing
        const leftDistance = this._tmpVec3C.length();
        const rightDistance = this._tmpVec3D.length();
        this._tmpVec3C.normalize();
        this._tmpVec3D.normalize();

        // Update laser scale
        this.leftLaser.scale.y = leftDistance;
        this.rightLaser.scale.y = rightDistance;

        // Position lasers at eye positions
        this.leftLaser.position.copy(this.leftEye.position);
        this.rightLaser.position.copy(this.rightEye.position);

        // Decompose head world matrix into pre-allocated objects
        this.headGroup.matrixWorld.decompose(this._tmpVec3E, this._tmpQuat, this._tmpVec3F);
        // _tmpVec3E = headWorldPos (no longer needed after decompose)
        // _tmpQuat = headWorldQuat -> invert it once for reuse
        // _tmpVec3F = headWorldScale (no longer needed)
        this._tmpQuat.invert(); // invertedHeadWorldQuat

        // Left laser: compute local direction, set quaternion, offset position
        this._tmpVec3E.copy(this._tmpVec3C).applyQuaternion(this._tmpQuat).normalize();
        this._tmpQuatB.setFromUnitVectors(this._upVec, this._tmpVec3E);
        this.leftLaser.quaternion.copy(this._tmpQuatB);
        this.leftLaser.position.add(this._tmpVec3E.multiplyScalar(leftDistance / 2));

        // Right laser: same pattern, reuse _tmpVec3E and _tmpQuatB
        this._tmpVec3E.copy(this._tmpVec3D).applyQuaternion(this._tmpQuat).normalize();
        this._tmpQuatB.setFromUnitVectors(this._upVec, this._tmpVec3E);
        this.rightLaser.quaternion.copy(this._tmpQuatB);
        this.rightLaser.position.add(this._tmpVec3E.multiplyScalar(rightDistance / 2));

      } else {
        // SCANNING MODE: Lasers sweep the area - ZERO allocations
        this.leftLaser.visible = true;
        this.rightLaser.visible = true;

        // Position at eyes
        this.leftLaser.position.copy(this.leftEye.position);
        this.rightLaser.position.copy(this.rightEye.position);

        // Scanning pattern - figure-8 sweep (cache shared sin)
        const scanSpeed = 0.3;
        const scanAngleY = Math.sin(this.time * scanSpeed) * 0.4;
        const scanAngleX = Math.sin(this.time * scanSpeed * 2) * 0.3;
        const sinScanX = Math.sin(scanAngleX); // shared between left & right

        // Left laser scan direction (reuse _tmpVec3C)
        this._tmpVec3C.set(Math.sin(scanAngleY - 0.2), sinScanX, 1).normalize();
        this._tmpQuatB.setFromUnitVectors(this._upVec, this._tmpVec3C);
        this.leftLaser.quaternion.copy(this._tmpQuatB);
        this.leftLaser.scale.y = this.MAIN_SIZE * 3;

        // Right laser scan direction (reuse _tmpVec3D)
        this._tmpVec3D.set(Math.sin(scanAngleY + 0.2), sinScanX, 1).normalize();
        this._tmpQuatB.setFromUnitVectors(this._upVec, this._tmpVec3D);
        this.rightLaser.quaternion.copy(this._tmpQuatB);
        this.rightLaser.scale.y = this.MAIN_SIZE * 3;

        // Offset position so laser starts at eye (use _tmpVec3E as temp)
        this.leftLaser.position.add(this._tmpVec3E.copy(this._tmpVec3C).multiplyScalar(this.MAIN_SIZE * 1.5));
        this.rightLaser.position.add(this._tmpVec3E.copy(this._tmpVec3D).multiplyScalar(this.MAIN_SIZE * 1.5));
      }

      // Update laser data for game collision detection - ZERO allocations
      if (this.onLaserUpdate) {
        // Get eye world positions
        this.leftEye.getWorldPosition(this._tmpVec3A);
        this.rightEye.getWorldPosition(this._tmpVec3B);

        const w = this.container.offsetWidth;
        const h = this.container.offsetHeight;

        // Helper: project world pos into cached data point (uses _tmpVec3F as temp)
        const projectInto = (worldPos: any, target: { x: number; y: number }) => {
          this._tmpVec3F.copy(worldPos).project(this.camera);
          target.x = (this._tmpVec3F.x * 0.5 + 0.5) * w;
          target.y = (-this._tmpVec3F.y * 0.5 + 0.5) * h;
        };

        // Project start points
        projectInto(this._tmpVec3A, this._cachedLaserData.leftStart);
        projectInto(this._tmpVec3B, this._cachedLaserData.rightStart);

        if (this.trackingTarget && this.targetPosition3D) {
          // Tracking mode: endpoint is the target
          projectInto(this.targetPosition3D, this._cachedLaserData.leftEnd);
          projectInto(this.targetPosition3D, this._cachedLaserData.rightEnd);
        } else {
          // Scanning mode: calculate endpoint from laser direction
          this.leftLaser.getWorldQuaternion(this._tmpQuat);
          this._tmpVec3C.set(0, 1, 0).applyQuaternion(this._tmpQuat);
          this._tmpVec3D.copy(this._tmpVec3A).add(this._tmpVec3C.multiplyScalar(this.MAIN_SIZE * 3));
          projectInto(this._tmpVec3D, this._cachedLaserData.leftEnd);

          this.rightLaser.getWorldQuaternion(this._tmpQuat);
          this._tmpVec3C.set(0, 1, 0).applyQuaternion(this._tmpQuat);
          this._tmpVec3D.copy(this._tmpVec3B).add(this._tmpVec3C.multiplyScalar(this.MAIN_SIZE * 3));
          projectInto(this._tmpVec3D, this._cachedLaserData.rightEnd);
        }

        this._cachedLaserData.visible = this.leftLaser.visible && this.rightLaser.visible;
        this.onLaserUpdate(this._cachedLaserData);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  // --- Godmode camera control API (called from React UI) ---

  cameraZoomIn() {
    this.cameraTargetDistance = Math.max(
      this.CAMERA_MIN_DISTANCE,
      this.cameraTargetDistance * 0.85
    );
  }

  cameraZoomOut() {
    this.cameraTargetDistance = Math.min(
      this.CAMERA_MAX_DISTANCE,
      this.cameraTargetDistance * 1.18
    );
  }

  cameraRotateLeft() {
    this.cameraYaw -= 0.15;
  }

  cameraRotateRight() {
    this.cameraYaw += 0.15;
  }

  cameraTiltUp() {
    this.cameraPitch = Math.min(this.CAMERA_MAX_PITCH, this.cameraPitch + 0.1);
  }

  cameraTiltDown() {
    this.cameraPitch = Math.max(this.CAMERA_MIN_PITCH, this.cameraPitch - 0.1);
  }

  cameraReset() {
    this.cameraYaw = 0;
    this.cameraPitch = 0.35;
    this.cameraTargetDistance = 1200;
    this.cameraPanX = 0;
    this.cameraPanY = 0;
    this.cameraPanZ = 0;
  }

  cameraFocus() {
    this.cameraPanX = 0;
    this.cameraPanY = 0;
    this.cameraPanZ = 0;
  }

  getCameraState() {
    return {
      yaw: this.cameraYaw,
      pitch: this.cameraPitch,
      distance: this.cameraDistance,
      targetDistance: this.cameraTargetDistance,
      panX: this.cameraPanX,
      panY: this.cameraPanY,
      panZ: this.cameraPanZ,
    };
  }

  destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove event listeners to prevent duplicates on quality change
    if (this._boundMouseMove) {
      document.removeEventListener("mousemove", this._boundMouseMove);
      this._boundMouseMove = null;
    }
    if (this._boundClick) {
      document.removeEventListener("click", this._boundClick);
      this._boundClick = null;
    }
    if (this._boundKeyDown) {
      document.removeEventListener("keydown", this._boundKeyDown);
      this._boundKeyDown = null;
    }
    if (this._boundKeyUp) {
      document.removeEventListener("keyup", this._boundKeyUp);
      this._boundKeyUp = null;
    }
    if (this._boundWheel) {
      document.removeEventListener("wheel", this._boundWheel);
      this._boundWheel = null;
    }
    if (this._boundMouseDown) {
      document.removeEventListener("mousedown", this._boundMouseDown);
      this._boundMouseDown = null;
    }
    if (this._boundMouseUp) {
      document.removeEventListener("mouseup", this._boundMouseUp);
      this._boundMouseUp = null;
    }
    if (this._boundContextMenu) {
      document.removeEventListener("contextmenu", this._boundContextMenu);
      this._boundContextMenu = null;
    }
    if (this._boundResize) {
      window.removeEventListener("resize", this._boundResize);
      this._boundResize = null;
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
    this.enemyShips = [];
    this.missiles3D = [];
    this.enemyLasers = [];
    this.explosions3D = [];
    this._explosionPool = [];
    this._explosionPoolInitialized = false;
    this._pendingBursts = [];
    this._formationBomberIndex.clear();
    this._geometryCache.clear();
    this.formations = [];
    this.buildings = [];
    this.lastFrameTime = 0;
    this.keysPressed.clear();
    this.megabotWorldPos.set(0, this.MEGABOT_STAND_Y, 0);
    this.currentWave = 0;
    this.waveState = 'intermission';
    this.waveTimer = 0;
    this.shieldHP = this.MAX_SHIELD_HP;
    this.upgradeLevel = 0;
    this.barrageCooldown = 0;
    this.shieldMesh = null;
  }
}
