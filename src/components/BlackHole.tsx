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
  settings: any;
  // Physics constants
  readonly SCHWARZSCHILD_RADIUS = 60; // Event horizon radius
  readonly PHOTON_SPHERE_RADIUS = 90; // 1.5 * Schwarzschild radius
  readonly ISCO_RADIUS = 180; // Innermost stable circular orbit (3 * Schwarzschild)
  readonly G = 50000; // Gravitational constant (scaled for visual effect)

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
    this.createAccretionDisk();
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
      return { particleCount: 150, photonCount: 500, enableParallax: true, enableTrails: false };
    } else {
      return { particleCount: 300, photonCount: 800, enableParallax: true, enableTrails: false };
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

    // Enhanced star material with gravitational lensing shader
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        blackHolePos: { value: new THREE.Vector3(0, 0, 0) },
        lensStrength: { value: 0.3 },
      },
      vertexShader: `
        uniform float time;
        uniform vec3 blackHolePos;
        uniform float lensStrength;

        attribute vec3 color;
        varying vec3 vColor;
        varying float vLensEffect;

        void main() {
          vColor = color;

          // Calculate distance to black hole for lensing effect
          vec3 worldPos = position;
          float dist = distance(worldPos, blackHolePos);

          // Gravitational lensing: bend light rays near black hole
          vec3 toBH = blackHolePos - worldPos;
          float lensing = lensStrength * (1000.0 / (dist + 100.0));
          vec3 bentPos = worldPos + toBH * lensing * 0.01;

          // Brightness varies with lensing (Einstein ring effect)
          vLensEffect = 1.0 + lensing * 0.5;

          vec4 mvPosition = modelViewMatrix * vec4(bentPos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // Twinkle effect
          float twinkle = sin(time * 2.0 + position.x * 0.1) * 0.5 + 1.0;
          gl_PointSize = 2.0 * twinkle * (1.0 + lensing * 0.2);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vLensEffect;

        void main() {
          // Circular point
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          // Soft glow
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);

          // Enhanced brightness from gravitational lensing
          vec3 color = vColor * vLensEffect;

          gl_FragColor = vec4(color, alpha * 0.8);
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

  createAccretionDisk() {
    const THREE = window.THREE;

    const diskGeometry = new THREE.RingGeometry(this.ISCO_RADIUS, 250, 128);
    const diskMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
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
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center) * 2.0;

          // Create spiral pattern with turbulence
          float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
          float spiral = sin(angle * 8.0 - dist * 5.0 + time * 2.0);
          float turbulence = sin(angle * 20.0 + time * 3.0) * cos(dist * 15.0 - time * 2.0);

          // Temperature gradient (inner = hotter = bluer)
          vec3 innerColor = vec3(0.6, 0.8, 1.0); // Hot blue-white
          vec3 midColor = vec3(1.0, 0.9, 0.6);   // Yellow
          vec3 outerColor = vec3(1.0, 0.3, 0.1); // Cool red-orange

          vec3 color = mix(innerColor, midColor, smoothstep(0.0, 0.5, dist));
          color = mix(color, outerColor, smoothstep(0.5, 1.0, dist));

          // Add spiral turbulence
          color += vec3(spiral * 0.2 + turbulence * 0.1);

          // Opacity based on distance and turbulence
          float opacity = (1.0 - dist) * 0.7;
          opacity *= (0.6 + spiral * 0.2 + abs(turbulence) * 0.2);

          gl_FragColor = vec4(color, opacity);
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

      // Calculate orbital velocity for circular orbit (Kepler)
      const orbitalSpeed = Math.sqrt(this.G / r) * 0.05;

      // Store 3D spherical orbital data
      particle.userData = {
        r: r,                    // radial distance
        theta: finalTheta,       // polar angle
        phi: phi,                // azimuthal angle
        vr: 0,                   // radial velocity (starts circular)
        vtheta: 0,               // polar velocity
        vphi: orbitalSpeed / r,  // angular velocity (circular orbit)
        L: r * orbitalSpeed,     // angular momentum (conserved)
      };

      this.particles.push(particle);
      this.scene.add(particle);
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
    const ar = -this.G / (r * r) + (data.L * data.L) / (r * r * r); // includes centrifugal term

    // Check orbital zones
    const inPhotonSphere = Math.abs(r - this.PHOTON_SPHERE_RADIUS) < 15;
    const inPlungeZone = r < this.ISCO_RADIUS;

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
      // Stable zone - gradual decay
      data.vr += ar * deltaTime * 0.08;
      data.inPhotonSphere = false;
    }

    // Update positions in spherical coordinates
    data.r += data.vr * deltaTime;
    data.theta += data.vtheta * deltaTime;
    data.phi += data.vphi * deltaTime;

    // Conservation of angular momentum: L = r² * vphi
    data.vphi = data.L / (data.r * data.r);

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

    particle.position.set(
      data.r * sinTheta * cosPhi,
      data.r * cosTheta,
      data.r * sinTheta * sinPhi
    );

    // Color based on position and velocity
    if (data.inPhotonSphere) {
      particle.material.color.setHSL(0.55, 1, 0.7);
      particle.material.opacity = 0.9;
      particle.scale.set(1.5, 1.5, 1.5);
    } else {
      const heatFactor = 1 - Math.max(0, (data.r - this.SCHWARZSCHILD_RADIUS) / 200);
      particle.material.color.setHSL(0.15 - heatFactor * 0.15, 1, 0.5 + heatFactor * 0.3);
      particle.material.opacity = 0.4 + heatFactor * 0.6;
      particle.scale.set(1, 1, 1);
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

      data.vr = 0;
      data.vtheta = 0;
      const orbitalSpeed = Math.sqrt(this.G / data.r) * 0.05;
      data.vphi = orbitalSpeed / data.r;
      data.L = data.r * orbitalSpeed;
    }
  }

  updateParticleTrail(particle: any, trailIndex: number) {
    const THREE = window.THREE;
    const trail = this.particleTrails[trailIndex];
    const positions = particle.userData.lastPositions;

    if (positions.length < 2) return;

    const points = positions.map((pos: any) => new THREE.Vector3(pos.x, pos.y, pos.z));
    trail.geometry.setFromPoints(points);
    trail.geometry.attributes.position.needsUpdate = true;

    // Fade trail based on heat
    const heatFactor = 1 - Math.max(0, (particle.userData.radius - this.SCHWARZSCHILD_RADIUS) / 200);
    const trailColor = new THREE.Color().setHSL(0.15 - heatFactor * 0.15, 1, 0.6);
    trail.material.color = trailColor;
    trail.material.opacity = 0.3 + heatFactor * 0.3;
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

    // Rotate accretion disk (differential rotation - inner faster than outer)
    if (this.accretionDisk) {
      this.accretionDisk.rotation.z += 0.003;
      if (this.accretionDisk.material.uniforms) {
        this.accretionDisk.material.uniforms.time.value = this.time;
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

  destroy() {
    if (this.renderer) {
      this.renderer.dispose();
      if (this.container && this.renderer.domElement) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
  }
}
