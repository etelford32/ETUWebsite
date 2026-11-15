/**
 * Performance utilities for the ETU website.
 *
 * Page prefetching is left to next/link (it prefetches routes as their links
 * scroll into view) and image lazy loading to next/image and the browser.
 */

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
