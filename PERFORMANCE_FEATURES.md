# Performance & Quality Features

This document describes the new performance optimizations and quality settings added to the ETU Website.

## 🎨 Animation Quality Settings

### Overview
Users can now control the quality of the hero black hole animation to optimize performance for their device and connection.

### Features
- **Quality Dropdown**: Located in the bottom-right of the hero section
- **Three Quality Levels**:
  - **Low (Fast)**: 150 particles, 400 photons, 2,000 stars - Optimized for slower devices
  - **Medium (Balanced)**: 300 particles, 800 photons, 5,000 stars - Default setting
  - **High (Quality)**: 10,000 particles, 1,200 photons, 8,000 stars - Full visual experience

### Technical Details
- Settings are persisted in localStorage
- Automatic quality detection based on:
  - Network connection speed (via Navigator.connection API)
  - Device memory
  - User's data saver preference
- Respects `prefers-reduced-motion` accessibility setting

### Files Added/Modified
- `src/components/QualitySettings.tsx` - Quality selector UI component
- `src/components/BlackHole.tsx` - Updated to support quality levels
- `src/app/page.tsx` - Integrated quality settings
- `src/lib/performance.ts` - Performance utilities

## 🚀 Performance Optimizations

### 1. Image Optimization
- **Modern Formats**: Automatic conversion to AVIF and WebP
- **Lazy Loading**: Images below the fold load only when needed
- **Responsive Sizes**: Multiple image sizes for different screen resolutions
- **Caching**: Aggressive cache headers for static assets (1 year)

### 2. Code Splitting
- **Dynamic Imports**: BlackHole component loads only when needed
- **Package Optimization**: Framer Motion is optimized via experimental imports

### 3. Resource Preloading
- **Page Prefetching**: `next/link` prefetches routes as their links scroll into view
- **Priority Loading**: Hero images marked as priority for faster LCP
- **Title Atlas**: `<EtuTitle preload>` on a page's top title fetches the letter atlas
  with the page, as AVIF (under half the size of the WebP)

### 3a. Lazy Loading
- **Trailer**: `TrailerPlayer` shows a lazy still and only fetches the video on play
- **Hero Copy**: `.reveal-now` fades in from CSS alone; `.reveal` (below the fold)
  waits for scroll
- **Header Menu**: the faction list comes from the root layout through
  `FactionNavProvider`, so the full faction profiles are not in every page's JavaScript
- **Fonts**: the mono face is not preloaded; it loads when first used

### 4. Network Optimization
- **Connection Detection**: Automatic quality adjustment based on network speed
- **Data Saver Support**: Respects user's data saver preference
- **Asset Caching**: Static assets cached for 1 year

### Configuration Files
- `next.config.js` - Enhanced with image optimization and caching headers
- `src/lib/performance.ts` - Centralized performance utilities

## 📊 Performance Metrics

### Expected Improvements
- **Initial Load**: ~30% faster for first-time visitors
- **Repeat Visits**: ~60% faster due to aggressive caching
- **Mobile Performance**: Significant improvement on slower connections
- **Memory Usage**: Reduced by up to 70% on low-quality setting

## 🎯 Usage

### For Users
1. Visit the homepage
2. Look for the "Animation Quality" control in the bottom-right
3. Select your preferred quality level
4. Settings are saved automatically

### For Developers
```typescript
// Using the QualitySettings component
import QualitySettings from '@/components/QualitySettings';

<QualitySettings
  onChange={(quality) => setQuality(quality)}
  defaultQuality="medium"
/>
```

```typescript
// Using performance utilities
import { initPerformanceOptimizations, detectConnectionQuality } from '@/lib/performance';

// Initialize all optimizations
initPerformanceOptimizations();

// Detect optimal quality
const quality = detectConnectionQuality(); // Returns 'low' | 'medium' | 'high'
```

## 🔧 Maintenance

### Testing Quality Levels
1. Open browser DevTools
2. Navigate to Application > Local Storage
3. Set `etu-animation-quality` to `low`, `medium`, or `high`
4. Refresh the page

### Monitoring Performance
- Use Lighthouse to measure performance scores
- Check Network tab for resource loading times
- Monitor memory usage in Performance tab
- Test on various connection speeds using Network throttling

## 🌐 Browser Compatibility
- Modern browsers: Full support
- Older browsers: Graceful degradation with fallback lazy loading
- Mobile devices: Optimized experience with automatic quality detection

## 📝 Future Enhancements
- [ ] Progressive quality upgrading (start low, upgrade when idle)
- [ ] Custom quality presets (power saver, balanced, performance)
- [ ] Per-component quality settings
- [ ] Analytics for quality preference distribution
- [ ] A/B testing for default quality levels
