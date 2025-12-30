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
}

export default function Megabot({ quality = "medium", trackingTarget = null }: MegabotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const megabotRef = useRef<any>(null);

  useEffect(() => {
    // Load Three.js dynamically
    const threeScript = document.createElement("script");
    threeScript.src = "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js";
    threeScript.async = true;

    threeScript.onload = () => {
      if (containerRef.current && window.THREE) {
        megabotRef.current = new MegabotScene(containerRef.current, quality);
      }
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

  // Camera controls
  mouse: any = { x: 0, y: 0 };
  cameraAngle: number = 0;
  cameraDistance: number = 1400; // Increased for building-sized mecha

  // Mouse tracking for button hover effects
  trackingTarget: { x: number; y: number } | null = null;
  targetRotation: { x: number; y: number } = { x: 0, y: 0 };
  currentRotation: { x: number; y: number } = { x: 0, y: 0 };

  // Megabot constants - BUILDING SIZED!
  readonly MAIN_SIZE = 350; // Increased for massive scale
  readonly SATELLITE_COUNT_LOW = 3;
  readonly SATELLITE_COUNT_MED = 6;
  readonly SATELLITE_COUNT_HIGH = 12;
  readonly PARTICLE_COUNT_LOW = 500;
  readonly PARTICLE_COUNT_MED = 2000;
  readonly PARTICLE_COUNT_HIGH = 5000;

  constructor(container: HTMLDivElement, quality: QualityLevel = "medium") {
    this.container = container;
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
    this.trackingTarget = target;

    if (target && this.camera && this.headGroup) {
      // Convert screen coordinates to 3D angle
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Calculate angle from center to mouse
      const dx = target.x - centerX;
      const dy = target.y - centerY;

      // Convert to rotation angles (limited range for natural movement)
      this.targetRotation.y = (dx / centerX) * 0.3; // Horizontal rotation (yaw)
      this.targetRotation.x = -(dy / centerY) * 0.2; // Vertical rotation (pitch)
    } else {
      // Return to neutral position
      this.targetRotation.x = 0;
      this.targetRotation.y = 0;
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

    // METALLIC ARMOR MATERIAL with advanced PBR shading
    const mechaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color(0.15, 0.16, 0.2) }, // Dark gunmetal
        metalness: { value: 0.95 },
        roughness: { value: 0.25 },
        envIntensity: { value: 0.8 },
        emissiveColor: { value: new THREE.Color(0.1, 0.2, 0.5) },
        emissiveIntensity: { value: 0.3 },
        panelLineColor: { value: new THREE.Color(0.05, 0.05, 0.08) },
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

          // Lighting setup (simulate 3-point lighting)
          vec3 lightDir1 = normalize(vec3(1.0, 1.0, 1.0));
          vec3 lightDir2 = normalize(vec3(-0.5, 0.3, 0.5));
          vec3 lightDir3 = normalize(vec3(0.0, -1.0, 0.2));

          vec3 lightColor1 = vec3(1.0, 0.98, 0.95) * 1.2;
          vec3 lightColor2 = vec3(0.6, 0.7, 1.0) * 0.5;
          vec3 lightColor3 = vec3(0.3, 0.4, 0.6) * 0.3;

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

          // Specular highlights (metallic reflection)
          vec3 halfVector1 = normalize(lightDir1 + viewDir);
          vec3 halfVector2 = normalize(lightDir2 + viewDir);

          float spec1 = ggx(normal, halfVector1, roughness) * NdotL1;
          float spec2 = ggx(normal, halfVector2, roughness * 1.2) * NdotL2;

          vec3 specular = (spec1 * lightColor1 + spec2 * lightColor2) * metalness;

          // Fake environment reflection (simulate sky/ground)
          float upFacing = normal.y * 0.5 + 0.5;
          vec3 skyColor = vec3(0.3, 0.5, 0.8);
          vec3 groundColor = vec3(0.1, 0.12, 0.15);
          vec3 envReflection = mix(groundColor, skyColor, upFacing) * envIntensity * metalness;

          // Fresnel rim lighting
          float rim = fresnel(viewDir, normal, 3.5);
          vec3 rimLight = vec3(0.3, 0.5, 1.0) * rim * 0.4;

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

    // METALLIC ACCENT MATERIAL with tech details
    const accentMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color(0.2, 0.22, 0.28) }, // Slightly lighter gunmetal
        metalness: { value: 0.92 },
        roughness: { value: 0.35 },
        glowColor: { value: new THREE.Color(0.2, 0.4, 0.8) },
        glowIntensity: { value: 0.5 },
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

    // ==================== HEAD - BUILDING SIZED ====================
    const headGroup = new THREE.Group();

    // Main head - larger and more imposing
    const headGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.45, this.MAIN_SIZE * 0.5, this.MAIN_SIZE * 0.38);
    const head = new THREE.Mesh(headGeometry, mechaMaterial);
    headGroup.add(head);

    // Face plate - multi-layered
    const facePlateGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.46, this.MAIN_SIZE * 0.3, this.MAIN_SIZE * 0.06);
    const facePlate = new THREE.Mesh(facePlateGeometry, accentMaterial);
    facePlate.position.z = this.MAIN_SIZE * 0.22;
    headGroup.add(facePlate);

    // Additional face armor layer
    const facePlate2Geometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.4, this.MAIN_SIZE * 0.2, this.MAIN_SIZE * 0.05);
    const facePlate2 = new THREE.Mesh(facePlate2Geometry, mechaMaterial);
    facePlate2.position.z = this.MAIN_SIZE * 0.25;
    facePlate2.position.y = -this.MAIN_SIZE * 0.05;
    headGroup.add(facePlate2);

    // V-Fin antenna (Gundam style) with enhanced shader
    const vFinGeometry = new THREE.ConeGeometry(this.MAIN_SIZE * 0.15, this.MAIN_SIZE * 0.4, 3);
    const vFinMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color(1.0, 0.7, 0.0) },
        glowColor: { value: new THREE.Color(1.0, 0.9, 0.3) },
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

    // EVIL LASER EYES with glow effect
    const eyeGeometry = new THREE.SphereGeometry(this.MAIN_SIZE * 0.06, 16, 16);
    const eyeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        eyeColor: { value: new THREE.Color(1.0, 0.0, 0.0) }, // Evil red
        glowIntensity: { value: 3.0 },
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
          float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), 3.0);

          // Evil pulsing effect
          float pulse = 0.8 + sin(time * 4.0) * 0.2;

          // Intense core with outer glow
          float core = 1.0 - fresnel * 0.3;
          vec3 finalColor = eyeColor * glowIntensity * pulse * (core + fresnel * 2.0);

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

    this.megabotParts.push({ mesh: leftEye, type: 'leftEye' });
    this.megabotParts.push({ mesh: rightEye, type: 'rightEye' });

    // Laser beam effects from eyes
    const laserGeometry = new THREE.CylinderGeometry(this.MAIN_SIZE * 0.03, this.MAIN_SIZE * 0.01, this.MAIN_SIZE * 8, 8);
    const laserMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        beamColor: { value: new THREE.Color(1.0, 0.1, 0.1) },
        intensity: { value: 2.0 },
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
          // Beam intensity from center to edge
          float distFromCenter = abs(vUv.x - 0.5) * 2.0;
          float beamIntensity = 1.0 - distFromCenter;
          beamIntensity = pow(beamIntensity, 2.0);

          // Pulsing energy
          float pulse = 0.7 + sin(time * 6.0 + vUv.y * 10.0) * 0.3;

          // Traveling energy waves
          float wave = sin(vUv.y * 20.0 - time * 10.0) * 0.5 + 0.5;

          vec3 finalColor = beamColor * intensity * beamIntensity * pulse * (0.7 + wave * 0.3);
          float alpha = beamIntensity * 0.9;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const leftLaser = new THREE.Mesh(laserGeometry, laserMaterial);
    leftLaser.rotation.x = Math.PI / 2;
    leftLaser.position.set(-this.MAIN_SIZE * 0.1, this.MAIN_SIZE * 0.05, this.MAIN_SIZE * 4.5);
    headGroup.add(leftLaser);

    const rightLaser = new THREE.Mesh(laserGeometry, laserMaterial.clone());
    rightLaser.rotation.x = Math.PI / 2;
    rightLaser.position.set(this.MAIN_SIZE * 0.1, this.MAIN_SIZE * 0.05, this.MAIN_SIZE * 4.5);
    headGroup.add(rightLaser);

    this.megabotParts.push({ mesh: leftLaser, type: 'leftLaser' });
    this.megabotParts.push({ mesh: rightLaser, type: 'rightLaser' });

    // Eye glow lights
    const leftEyeLight = new THREE.PointLight(0xff0000, 3, 500);
    leftEyeLight.position.copy(leftEye.position);
    headGroup.add(leftEyeLight);

    const rightEyeLight = new THREE.PointLight(0xff0000, 3, 500);
    rightEyeLight.position.copy(rightEye.position);
    headGroup.add(rightEyeLight);

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

    // Massive shoulder armor panels
    for (let side = -1; side <= 1; side += 2) {
      const shoulderPlateGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.25, this.MAIN_SIZE * 0.4, this.MAIN_SIZE * 0.08);
      const shoulderPlate = new THREE.Mesh(shoulderPlateGeometry, accentMaterial);
      shoulderPlate.position.set(side * this.MAIN_SIZE * 0.45, this.MAIN_SIZE * 0.35, this.MAIN_SIZE * 0.1);
      shoulderPlate.rotation.y = side * 0.15;
      torsoGroup.add(shoulderPlate);
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
        const nozzleMaterial = new THREE.MeshStandardMaterial({
          color: 0x2a2a4e,
          metalness: 0.9,
          roughness: 0.1,
          emissive: new THREE.Color(0.2, 0.5, 1.0),
          emissiveIntensity: 0.6,
        });
        const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
        nozzle.rotation.x = Math.PI / 2;
        nozzle.position.set(
          side * this.MAIN_SIZE * 0.25,
          this.MAIN_SIZE * (0.2 + nozzle * -0.2),
          -this.MAIN_SIZE * 0.5
        );
        torsoGroup.add(nozzle);
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

      // Hydraulic pistons for elbow
      for (let piston = 0; piston < 2; piston++) {
        const pistonGeometry = new THREE.CylinderGeometry(this.MAIN_SIZE * 0.03, this.MAIN_SIZE * 0.03, this.MAIN_SIZE * 0.35, 8);
        const pistonMesh = new THREE.Mesh(pistonGeometry, new THREE.MeshStandardMaterial({
          color: 0x3a3a5e,
          metalness: 1.0,
          roughness: 0.3,
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
      }

      // Wrist joint
      const wristGeometry = new THREE.SphereGeometry(this.MAIN_SIZE * 0.12, 16, 16);
      const wrist = new THREE.Mesh(wristGeometry, accentMaterial);
      wrist.position.y = -this.MAIN_SIZE * 1.95;
      armGroup.add(wrist);

      // Hand/Fist - MASSIVE
      const handMainGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.22, this.MAIN_SIZE * 0.3, this.MAIN_SIZE * 0.22);
      const handMain = new THREE.Mesh(handMainGeometry, mechaMaterial);
      handMain.position.y = -this.MAIN_SIZE * 2.2;
      armGroup.add(handMain);

      // Knuckle guards
      const knuckleGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.24, this.MAIN_SIZE * 0.1, this.MAIN_SIZE * 0.24);
      const knuckles = new THREE.Mesh(knuckleGeometry, accentMaterial);
      knuckles.position.y = -this.MAIN_SIZE * 2.05;
      knuckles.position.z = this.MAIN_SIZE * 0.05;
      armGroup.add(knuckles);

      // Fingers (basic representation)
      for (let finger = 0; finger < 4; finger++) {
        const fingerGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.04, this.MAIN_SIZE * 0.15, this.MAIN_SIZE * 0.04);
        const fingerMesh = new THREE.Mesh(fingerGeometry, mechaMaterial);
        fingerMesh.position.set(
          this.MAIN_SIZE * (-0.08 + finger * 0.055),
          -this.MAIN_SIZE * 2.4,
          this.MAIN_SIZE * 0.08
        );
        fingerMesh.rotation.x = 0.3;
        armGroup.add(fingerMesh);
      }

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
          color: 0x3a3a5e,
          metalness: 1.0,
          roughness: 0.2,
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

      // Knee guard armor
      const kneeGuardGeometry = new THREE.BoxGeometry(this.MAIN_SIZE * 0.25, this.MAIN_SIZE * 0.2, this.MAIN_SIZE * 0.15);
      const kneeGuard = new THREE.Mesh(kneeGuardGeometry, mechaMaterial);
      kneeGuard.position.y = -this.MAIN_SIZE * 1.25;
      kneeGuard.position.z = this.MAIN_SIZE * 0.15;
      legGroup.add(kneeGuard);

      // Knee hydraulics
      for (let piston = 0; piston < 2; piston++) {
        const kneePistonGeometry = new THREE.CylinderGeometry(this.MAIN_SIZE * 0.04, this.MAIN_SIZE * 0.04, this.MAIN_SIZE * 0.3, 8);
        const kneePiston = new THREE.Mesh(kneePistonGeometry, new THREE.MeshStandardMaterial({
          color: 0x3a3a5e,
          metalness: 1.0,
          roughness: 0.3,
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
          color: 0x2a2a4e,
          metalness: 0.9,
          roughness: 0.1,
          emissive: new THREE.Color(0.8, 0.4, 0.0),
          emissiveIntensity: 0.7,
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
        orbitSpeed: 0.0003 + Math.random() * 0.0005,
        yOffset: yOffset,
        rotationSpeed: 0.01 + Math.random() * 0.01,
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

  addEventListeners() {
    // Mouse movement for parallax
    document.addEventListener("mousemove", (e) => {
      this.mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
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

    // Smooth camera movement based on mouse
    this.cameraAngle += this.mouse.x * 0.001;
    const targetCameraY = 300 + this.mouse.y * 100;
    this.camera.position.y += (targetCameraY - this.camera.position.y) * 0.05;

    this.camera.position.x = Math.sin(this.cameraAngle) * this.cameraDistance;
    this.camera.position.z = Math.cos(this.cameraAngle) * this.cameraDistance;
    this.camera.lookAt(0, 0, 0);

    // Animate main Megabot
    if (this.mainMegabot) {
      // Slow menacing rotation
      this.mainMegabot.rotation.y += 0.001;

      // Animate individual parts
      this.megabotParts.forEach((part) => {
        // Animate evil laser eyes
        if (part.type === 'leftEye' || part.type === 'rightEye') {
          if (part.mesh.material.uniforms) {
            part.mesh.material.uniforms.time.value = this.time;
            // Intensify the glow periodically
            const intensity = 3.0 + Math.sin(this.time * 2.0) * 1.0;
            part.mesh.material.uniforms.glowIntensity.value = intensity;
          }
        }

        // Animate laser beams
        if (part.type === 'leftLaser' || part.type === 'rightLaser') {
          if (part.mesh.material.uniforms) {
            part.mesh.material.uniforms.time.value = this.time;
            // Pulsing beam intensity
            const intensity = 2.0 + Math.sin(this.time * 3.0) * 0.5;
            part.mesh.material.uniforms.intensity.value = intensity;
          }
          // Subtle beam movement/scanning
          part.mesh.rotation.z = Math.sin(this.time * 0.5) * 0.05;
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
          if (this.trackingTarget) {
            // Smoothly interpolate current rotation toward target
            const lerpSpeed = 0.1;
            this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * lerpSpeed;
            this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * lerpSpeed;

            part.mesh.rotation.x = this.currentRotation.x;
            part.mesh.rotation.y = this.currentRotation.y;

            // Intensify eye glow when tracking
            this.megabotParts.forEach((eyePart) => {
              if ((eyePart.type === 'leftEye' || eyePart.type === 'rightEye') && eyePart.mesh.material.uniforms) {
                eyePart.mesh.material.uniforms.glowIntensity.value = 5.0; // Extra intense when tracking
              }
            });
          } else {
            // Default menacing scan when not tracking
            part.mesh.rotation.y = Math.sin(this.time * 0.3) * 0.2;
            part.mesh.rotation.x = Math.sin(this.time * 0.5) * 0.1;
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
