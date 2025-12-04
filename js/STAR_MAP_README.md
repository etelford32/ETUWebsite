# 🌟 3D Interactive Star Map Hero

## Overview
A performant, GPU-accelerated 3D star field that replaces the static hero background with an immersive, interactive galaxy experience.

## Features

### ✨ Visual Features
- **15,000 stars** (desktop) with instanced rendering for optimal performance
- **4 animated nebula clouds** with additive blending and pulse effects
- **Mouse parallax** - camera follows cursor for immersive depth
- **Auto-rotation** - gentle camera movement when idle (returns after 5s of no interaction)
- **Color variety** - Stars have realistic color tints (blue-white, yellow-white, red-tint)
- **Smooth fade-in** - 2s animation on load

### ⚡ Performance Optimizations
- **GPU-accelerated** using Three.js InstancedMesh (1 draw call for all stars!)
- **Adaptive quality** based on device capabilities:
  - Desktop/High-end: 15k stars, 4 nebulae, full effects
  - Mobile/Low-end: 5k stars, 2 nebulae, reduced effects
  - Reduced motion: 2k stars, no nebulae, animations disabled
- **Pixel ratio capped** at 2x to prevent performance issues on high-DPI displays
- **WebGL detection** with graceful fallback to static background
- **Lazy initialization** - only runs when hero section is visible

### 🎨 Integration
- **Blends with Christmas background** using `mix-blend-mode: screen`
- Christmas image set to 40% opacity for beautiful layering
- Enhanced text shadows for perfect readability
- All existing hero elements preserved (badges, orbs, particles)

## Browser Support
- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 15+, Edge 90+
- **Fallback**: Devices without WebGL see the original static Christmas background
- **Accessibility**: Respects `prefers-reduced-motion` setting

## Performance Metrics
- **Initial load**: Three.js (~600KB, cached, loaded with `defer`)
- **Runtime memory**: ~50-80MB (varies by star count)
- **FPS**: Locked to 60fps (or display refresh rate)
- **GPU usage**: Low-medium (optimized for integrated graphics)

## Files
- `/js/star-map-hero.js` - Main star map class
- `/src/input.css` - Star map integration styles (lines 419-465)
- `/index.html` - Three.js CDN + script tag

## Customization

### Adjusting Star Count
Edit `detectCapabilities()` in `star-map-hero.js`:
```javascript
return {
  starCount: 20000,  // Increase for more stars
  nebulaCount: 6,    // Add more nebulae
  enableParallax: true,
  enableAutoRotate: true
};
```

### Changing Colors
Modify the `colors` array in `createStars()`:
```javascript
const colors = [
  new THREE.Color(0xffffff), // White
  new THREE.Color(0xff6b35), // Orange (faction color?)
  new THREE.Color(0x4a90e2), // Blue
];
```

### Adjusting Parallax Sensitivity
In `animate()` method:
```javascript
this.camera.position.x += (this.mouse.x * 100 - this.camera.position.x) * 0.05;
//                                      ^^^^ Increase for more movement
```

## Troubleshooting

### Stars not appearing?
1. Check browser console for WebGL errors
2. Verify Three.js loaded: Open console and type `THREE`
3. Check if element exists: `document.getElementById('hero-star-map')`

### Performance issues?
1. Reduce star count in `detectCapabilities()`
2. Disable nebulae: `nebulaCount: 0`
3. Disable auto-rotate: `enableAutoRotate: false`

### Stars too dim/bright?
Adjust opacity in `createStars()`:
```javascript
const starMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 1.0  // Increase for brighter stars
});
```

## Future Enhancements
- [ ] Add shooting stars/meteor effects
- [ ] Implement faction territory colored zones
- [ ] Click-to-explore: Zoom into star clusters
- [ ] Add constellation lines (optional toggle)
- [ ] Sync with game API for real-time galaxy state
- [ ] VR support using WebXR

## Credits
Built with Three.js (r159) - https://threejs.org
Part of the ETU Homepage Enhancement Initiative

---

*"Feel the Galaxy Before You Play It"* 🚀
