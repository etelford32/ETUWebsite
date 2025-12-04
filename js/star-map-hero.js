/**
 * ETU 3D Star Map Hero
 * Performant, interactive star field using Three.js
 * GPU-accelerated with instanced rendering
 */

class StarMapHero {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn(`Container ${containerId} not found`);
      return;
    }

    // Performance settings based on device capability
    this.settings = this.detectCapabilities();

    // State
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.autoRotate = true;
    this.autoRotateSpeed = 0.0002;
    this.time = 0;

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
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Adjust settings based on device
    if (prefersReducedMotion) {
      return { starCount: 2000, nebulaCount: 0, enableParallax: false, enableAutoRotate: false };
    } else if (isMobile || isLowEnd) {
      return { starCount: 5000, nebulaCount: 2, enableParallax: true, enableAutoRotate: true };
    } else {
      return { starCount: 15000, nebulaCount: 4, enableParallax: true, enableAutoRotate: true };
    }
  }

  isWebGLAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  showFallback() {
    // Keep the existing static background as fallback
    console.log('WebGL not available, using fallback background');
    this.container.style.background = 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a14 100%)';
  }

  init() {
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
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
    this.renderer.setClearColor(0x000000, 0);

    // Add canvas to container
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.zIndex = '1';
    this.container.appendChild(this.renderer.domElement);
  }

  createStars() {
    const starCount = this.settings.starCount;

    // Create geometry for a single star (point)
    const starGeometry = new THREE.SphereGeometry(0.5, 4, 4);

    // Create material
    const starMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });

    // Use InstancedMesh for massive performance boost
    this.starField = new THREE.InstancedMesh(starGeometry, starMaterial, starCount);

    // Create star data for animations
    this.starData = [];

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
        color: colors[Math.floor(Math.random() * colors.length)]
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
    if (this.settings.nebulaCount === 0) return;

    this.nebulaClouds = [];
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
        side: THREE.DoubleSide
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
        pulseOffset: Math.random() * Math.PI * 2
      });

      this.scene.add(nebula);
    }
  }

  addEventListeners() {
    // Mouse move for parallax
    if (this.settings.enableParallax) {
      document.addEventListener('mousemove', (e) => {
        this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
        this.mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
        this.autoRotate = false; // Stop auto-rotate on interaction
      });

      // Reset auto-rotate after inactivity
      let inactivityTimer;
      document.addEventListener('mousemove', () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
          this.autoRotate = true;
        }, 5000);
      });
    }

    // Handle resize
    window.addEventListener('resize', () => this.onWindowResize(), false);

    // Touch support for mobile
    if ('ontouchstart' in window) {
      document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
          this.mouse.targetX = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
          this.mouse.targetY = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
        }
      }, { passive: true });
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

    this.time += 0.01;

    // Smooth mouse interpolation
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    // Camera movement
    if (this.settings.enableParallax) {
      this.camera.position.x += (this.mouse.x * 50 - this.camera.position.x) * 0.05;
      this.camera.position.y += (-this.mouse.y * 50 - this.camera.position.y) * 0.05;
    }

    // Auto-rotate when idle
    if (this.autoRotate && this.settings.enableAutoRotate) {
      this.camera.position.x = Math.sin(this.time * this.autoRotateSpeed) * 100;
      this.camera.position.y = Math.cos(this.time * this.autoRotateSpeed * 0.5) * 50;
    }

    this.camera.lookAt(0, 0, -500);

    // Animate star field rotation
    if (this.starField) {
      this.starField.rotation.y += 0.0001;
    }

    // Animate nebula clouds
    if (this.nebulaClouds) {
      this.nebulaClouds.forEach((cloud, i) => {
        cloud.mesh.rotation.x += cloud.rotationSpeed;
        cloud.mesh.rotation.y += cloud.rotationSpeed * 0.5;

        // Pulse opacity
        const pulse = Math.sin(this.time * cloud.pulseSpeed + cloud.pulseOffset);
        cloud.mesh.material.opacity = 0.05 + pulse * 0.03;
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  // Public method to clean up
  destroy() {
    window.removeEventListener('resize', this.onWindowResize);
    if (this.renderer) {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

// Initialize when DOM is ready and Three.js is loaded
function initStarMap() {
  if (typeof THREE === 'undefined') {
    console.warn('Three.js not loaded, skipping star map initialization');
    return;
  }

  // Only initialize if the hero section exists
  const heroSection = document.getElementById('hero-star-map');
  if (heroSection) {
    window.starMapHero = new StarMapHero('hero-star-map');
  }
}

// Auto-initialize if Three.js is already loaded
if (typeof THREE !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStarMap);
  } else {
    initStarMap();
  }
}

// Export for manual initialization
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StarMapHero;
}
