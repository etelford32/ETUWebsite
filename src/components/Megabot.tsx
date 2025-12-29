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
}

export default function Megabot({ quality = "medium" }: MegabotProps) {
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

  // Camera controls
  mouse: any = { x: 0, y: 0 };
  cameraAngle: number = 0;
  cameraDistance: number = 800;

  // Megabot constants
  readonly MAIN_SIZE = 200;
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

    // Core sphere (energy core)
    const coreGeometry = new THREE.SphereGeometry(this.MAIN_SIZE * 0.3, 32, 32);
    const coreMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        glowColor: { value: new THREE.Color(0.2, 0.6, 1.0) },
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
        uniform vec3 glowColor;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), 2.0);

          // Pulsing energy effect
          float pulse = 0.7 + sin(time * 2.0) * 0.3;

          // Energy patterns
          float pattern = sin(vPosition.x * 0.1 + time) * cos(vPosition.y * 0.1 - time) * 0.5 + 0.5;

          vec3 finalColor = glowColor * (1.0 + fresnel * 2.0) * pulse * (0.8 + pattern * 0.4);
          float alpha = 0.9 + fresnel * 0.1;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    this.mainMegabot.add(core);
    this.megabotParts.push({ mesh: core, type: 'core' });

    // Outer shell segments (mechanical armor)
    const shellCount = 8;
    for (let i = 0; i < shellCount; i++) {
      const angle = (i / shellCount) * Math.PI * 2;
      const shellGeometry = new THREE.BoxGeometry(
        this.MAIN_SIZE * 0.4,
        this.MAIN_SIZE * 0.8,
        this.MAIN_SIZE * 0.15
      );

      const shellMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        metalness: 0.9,
        roughness: 0.2,
        emissive: new THREE.Color(0.1, 0.3, 0.6),
        emissiveIntensity: 0.5,
      });

      const shell = new THREE.Mesh(shellGeometry, shellMaterial);
      const radius = this.MAIN_SIZE * 0.6;
      shell.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      shell.rotation.y = -angle;

      this.mainMegabot.add(shell);
      this.megabotParts.push({
        mesh: shell,
        type: 'shell',
        baseAngle: angle,
        rotationSpeed: 0.001 + Math.random() * 0.002
      });
    }

    // Rotating rings
    for (let ringIndex = 0; ringIndex < 3; ringIndex++) {
      const ringGeometry = new THREE.TorusGeometry(
        this.MAIN_SIZE * (0.7 + ringIndex * 0.15),
        this.MAIN_SIZE * 0.02,
        16,
        64
      );

      const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a90e2,
        metalness: 1.0,
        roughness: 0.1,
        emissive: new THREE.Color(0.2, 0.4, 0.8),
        emissiveIntensity: 0.8,
      });

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2 + (ringIndex * 0.3);
      ring.rotation.y = ringIndex * 0.5;

      this.mainMegabot.add(ring);
      this.megabotParts.push({
        mesh: ring,
        type: 'ring',
        rotationSpeed: 0.002 * (ringIndex + 1),
        axis: ringIndex % 2 === 0 ? 'z' : 'x'
      });
    }

    // Add point lights for dramatic lighting
    const light1 = new THREE.PointLight(0x4a90e2, 2, 1000);
    light1.position.set(0, 0, 0);
    this.mainMegabot.add(light1);

    const light2 = new THREE.PointLight(0xff6b35, 1.5, 800);
    light2.position.set(this.MAIN_SIZE, this.MAIN_SIZE, 0);
    this.mainMegabot.add(light2);

    this.scene.add(this.mainMegabot);
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
      this.mainMegabot.rotation.y += 0.002;

      // Animate individual parts
      this.megabotParts.forEach((part) => {
        if (part.type === 'core' && part.mesh.material.uniforms) {
          part.mesh.material.uniforms.time.value = this.time;
        }

        if (part.type === 'shell') {
          const wobble = Math.sin(this.time * 2 + part.baseAngle) * 0.1;
          const radius = this.MAIN_SIZE * (0.6 + wobble * 0.1);
          part.mesh.position.x = Math.cos(part.baseAngle) * radius;
          part.mesh.position.z = Math.sin(part.baseAngle) * radius;
          part.mesh.rotation.y += part.rotationSpeed;
        }

        if (part.type === 'ring') {
          if (part.axis === 'z') {
            part.mesh.rotation.z += part.rotationSpeed;
          } else {
            part.mesh.rotation.x += part.rotationSpeed;
          }
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
