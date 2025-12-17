/**
 * Performance optimization utilities for ETU Website
 */

/**
 * Preload critical resources
 */
export function preloadCriticalAssets() {
  if (typeof window === "undefined") return;

  // Preload Three.js for hero animation
  const threeLink = document.createElement("link");
  threeLink.rel = "preload";
  threeLink.as = "script";
  threeLink.href = "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js";
  document.head.appendChild(threeLink);
}

/**
 * Lazy load images that are below the fold
 */
export function setupLazyLoading() {
  if (typeof window === "undefined") return;
  if ("loading" in HTMLImageElement.prototype) {
    // Browser supports native lazy loading
    return;
  }

  // Fallback for older browsers
  const images = document.querySelectorAll("img[loading='lazy']");
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src || "";
        img.classList.remove("lazy");
        imageObserver.unobserve(img);
      }
    });
  });

  images.forEach((img) => imageObserver.observe(img));
}

/**
 * Detect connection quality and suggest animation quality
 */
export function detectConnectionQuality(): "low" | "medium" | "high" {
  if (typeof window === "undefined") return "medium";

  // Check if user has data saver enabled
  const connection = (navigator as any).connection;
  if (connection) {
    if (connection.saveData) {
      return "low";
    }

    // Check effective connection type
    const effectiveType = connection.effectiveType;
    if (effectiveType === "slow-2g" || effectiveType === "2g") {
      return "low";
    }
    if (effectiveType === "3g") {
      return "medium";
    }
  }

  // Check device memory (if available)
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory && deviceMemory < 4) {
    return "low";
  }
  if (deviceMemory && deviceMemory >= 8) {
    return "high";
  }

  return "medium";
}

/**
 * Prefetch next page resources
 */
export function prefetchNextPage(href: string) {
  if (typeof window === "undefined") return;

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Initialize all performance optimizations
 */
export function initPerformanceOptimizations() {
  if (typeof window === "undefined") return;

  // Preload critical assets
  preloadCriticalAssets();

  // Setup lazy loading fallback
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupLazyLoading);
  } else {
    setupLazyLoading();
  }

  // Prefetch important pages
  setTimeout(() => {
    prefetchNextPage("/leaderboard");
    prefetchNextPage("/factions/crystal-intelligences");
  }, 2000);
}
