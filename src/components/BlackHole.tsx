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
  settings: any;

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
      return { particleCount: 100, enableParallax: false };
    } else if (isMobile) {
      return { particleCount: 300, enableParallax: true };
    } else {
      return { particleCount: 800, enableParallax: true };
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

  createBlackHole() {
    const THREE = window.THREE;

    // Event horizon (black sphere)
    const eventHorizonGeometry = new THREE.SphereGeometry(60, 64, 64);
    const eventHorizonMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
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
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          // Pure black with subtle edge glow
          vec3 viewDirection = normalize(vPosition);
          float rim = 1.0 - abs(dot(viewDirection, vNormal));
          rim = pow(rim, 3.0);

          vec3 edgeGlow = vec3(0.1, 0.05, 0.2) * rim * 0.3;
          gl_FragColor = vec4(edgeGlow, 1.0);
        }
      `,
    });

    this.blackHole = new THREE.Mesh(eventHorizonGeometry, eventHorizonMaterial);
    this.scene.add(this.blackHole);

    // Gravitational lensing ring (photon sphere)
    const ringGeometry = new THREE.TorusGeometry(90, 3, 16, 100);
    const ringMaterial = new THREE.ShaderMaterial({
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
          float pulse = sin(time * 2.0 + vUv.x * 10.0) * 0.5 + 0.5;
          vec3 color = vec3(0.6, 0.8, 1.0) * (0.5 + pulse * 0.5);
          float opacity = 0.6 + pulse * 0.4;
          gl_FragColor = vec4(color, opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const photonSphere = new THREE.Mesh(ringGeometry, ringMaterial);
    photonSphere.rotation.x = Math.PI / 2;
    this.scene.add(photonSphere);
    this.blackHole.photonSphere = photonSphere;
  }

  createAccretionDisk() {
    const THREE = window.THREE;

    const diskGeometry = new THREE.RingGeometry(100, 250, 128);
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

          // Create spiral pattern
          float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
          float spiral = sin(angle * 8.0 - dist * 5.0 + time * 2.0);

          // Inner glow (hotter = bluer)
          vec3 innerColor = vec3(0.5, 0.7, 1.0);
          vec3 outerColor = vec3(1.0, 0.4, 0.2);
          vec3 color = mix(innerColor, outerColor, dist);

          // Add spiral turbulence
          color += vec3(spiral * 0.2);

          // Opacity based on distance
          float opacity = (1.0 - dist) * 0.6;
          opacity *= (0.7 + spiral * 0.3);

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
      const geometry = new THREE.SphereGeometry(1, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.1 + Math.random() * 0.1, 1, 0.6),
        transparent: true,
        opacity: 0.8,
      });

      const particle = new THREE.Mesh(geometry, material);

      // Start particles in orbit around the black hole
      const angle = Math.random() * Math.PI * 2;
      const radius = 150 + Math.random() * 150;
      const height = (Math.random() - 0.5) * 100;

      particle.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );

      // Store orbital data
      particle.userData = {
        angle: angle,
        radius: radius,
        height: height,
        speed: 0.01 + Math.random() * 0.02,
        spiralSpeed: 0.995 + Math.random() * 0.004, // Gradual inward spiral
      };

      this.particles.push(particle);
      this.scene.add(particle);
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

    this.time += 0.016;

    // Smooth mouse interpolation
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    // Camera parallax
    if (this.settings.enableParallax) {
      this.camera.position.x += (this.mouse.x * 100 - this.camera.position.x) * 0.05;
      this.camera.position.y += (-this.mouse.y * 100 + 200 - this.camera.position.y) * 0.05;
      this.camera.lookAt(0, 0, 0);
    }

    // Rotate black hole slowly
    if (this.blackHole) {
      this.blackHole.rotation.y += 0.001;

      // Update shader uniforms
      if (this.blackHole.material.uniforms) {
        this.blackHole.material.uniforms.time.value = this.time;
      }

      // Rotate photon sphere faster
      if (this.blackHole.photonSphere) {
        this.blackHole.photonSphere.rotation.z += 0.01;
        if (this.blackHole.photonSphere.material.uniforms) {
          this.blackHole.photonSphere.material.uniforms.time.value = this.time;
        }
      }
    }

    // Rotate accretion disk
    if (this.accretionDisk) {
      this.accretionDisk.rotation.z += 0.003;
      if (this.accretionDisk.material.uniforms) {
        this.accretionDisk.material.uniforms.time.value = this.time;
      }
    }

    // Animate particles spiraling into black hole
    this.particles.forEach((particle) => {
      const data = particle.userData;

      // Orbital motion
      data.angle += data.speed;
      data.radius *= data.spiralSpeed;

      // If too close to black hole, reset to outer edge
      if (data.radius < 70) {
        data.radius = 250 + Math.random() * 50;
        data.angle = Math.random() * Math.PI * 2;
        data.height = (Math.random() - 0.5) * 100;
      }

      // Update position
      particle.position.x = Math.cos(data.angle) * data.radius;
      particle.position.z = Math.sin(data.angle) * data.radius;
      particle.position.y = data.height * (data.radius / 250); // Flatten as it spirals in

      // Fade and heat up as it approaches
      const heatFactor = 1 - (data.radius / 250);
      particle.material.opacity = 0.3 + heatFactor * 0.7;
      particle.material.color.setHSL(0.1 - heatFactor * 0.1, 1, 0.5 + heatFactor * 0.3);
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
