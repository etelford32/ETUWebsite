# QA Audit Report: Homepage Hero Laser Eyes & Button Animations
**Date:** 2026-01-02
**Component:** Hero Section (page.tsx) + Megabot Component
**Severity Levels:** 🔴 Critical | 🟡 High | 🟠 Medium | 🔵 Low

---

## Executive Summary
The laser eyes and button animations are not working properly due to **3 critical bugs** in state management and **1 potential null reference issue** in 3D targeting. Additionally, there are **2 logic inconsistencies** that may cause unexpected behavior.

---

## 🔴 CRITICAL ISSUES

### Issue #1: Mouse Position Not Cleared on Button Leave
**File:** `src/app/page.tsx:45-48`
**Severity:** 🔴 Critical
**Impact:** Lasers continue tracking old position after mouse leaves button

**Problem:**
```javascript
const handleButtonLeave = () => {
  setHoveredButton(null);
  setButtonBounds(null);
  // ❌ Missing: setMousePosition(null)
};
```

The `handleButtonLeave` function clears `hoveredButton` and `buttonBounds` but **fails to reset `mousePosition`**. This means:
- The Megabot component still receives `trackingTarget={mousePosition}` with stale coordinates
- Lasers may continue aiming at the last hovered position instead of returning to scan mode
- The condition `if (this.targetPosition3D && this.trackingTarget)` in Megabot.tsx:2288 remains true

**Fix Required:**
```javascript
const handleButtonLeave = () => {
  setHoveredButton(null);
  setMousePosition({ x: 0, y: 0 }); // ✅ Reset to default or null
  setButtonBounds(null);
};
```

**Why This Breaks the Animation:**
When you leave the button, `setTrackingTarget(trackingTarget)` is called with the old mouse position still set, so the Megabot thinks it's still targeting something. The lasers don't return to scanning mode.

---

### Issue #2: Potential Null Reference in Plane Intersection
**File:** `src/components/Megabot.tsx:277-280`
**Severity:** 🔴 Critical
**Impact:** May cause lasers to aim at (0,0,0) origin or undefined behavior

**Problem:**
```javascript
const targetPos = new THREE.Vector3();
raycaster.ray.intersectPlane(plane, targetPos);
// ❌ No null check! intersectPlane can return null

this.targetPosition3D = targetPos;
```

According to Three.js documentation, `Ray.intersectPlane(plane, target)` returns:
- The `target` Vector3 if intersection exists
- `null` if no intersection

If the ray doesn't intersect the plane (edge case with extreme angles), `targetPos` remains at its default (0, 0, 0), causing lasers to aim at the scene origin instead of the button.

**Fix Required:**
```javascript
const targetPos = new THREE.Vector3();
const intersection = raycaster.ray.intersectPlane(plane, targetPos);

if (intersection) {
  this.targetPosition3D = targetPos;
} else {
  console.warn('❌ Ray did not intersect plane');
  this.targetPosition3D = null; // Fallback to scanning mode
}
```

**Why This Breaks the Animation:**
On certain screen positions or camera angles, the raycast might fail, causing lasers to point at (0,0,0) world coordinates instead of the button.

---

### Issue #3: Inconsistent State Management for Tracking
**File:** `src/components/Megabot.tsx:2288`
**Severity:** 🟡 High
**Impact:** Lasers may not activate when expected

**Problem:**
The condition for tracking mode checks TWO separate state variables:
```javascript
if (this.targetPosition3D && this.trackingTarget) {
  // TRACKING MODE
} else {
  // SCANNING MODE
}
```

However, these two states can become desynchronized:
- `trackingTarget` is set from props in useEffect (line 62-65)
- `targetPosition3D` is computed inside `setTrackingTarget` (line 280)
- If plane intersection fails, `targetPosition3D` could be null while `trackingTarget` is still set

**Issue Chain:**
1. User hovers button → `trackingTarget` set → `setTrackingTarget` called
2. Plane intersection fails → `targetPosition3D` remains null
3. Condition `this.targetPosition3D && this.trackingTarget` is FALSE
4. Lasers stay in scanning mode even though button is hovered

**Fix Required:**
Use a single source of truth. Either:
- Check only `trackingTarget` and handle null `targetPosition3D` gracefully
- Or ensure `setTrackingTarget` sets `trackingTarget` to null if intersection fails

---

## 🟠 MEDIUM ISSUES

### Issue #4: Laser Offset Calculation May Be Incorrect
**File:** `src/components/Megabot.tsx:2346-2349`
**Severity:** 🟠 Medium
**Impact:** Lasers may not appear to start exactly at eye positions

**Problem:**
```javascript
// Move laser origin to eye center (cylinder's center is at origin, we want base at eye)
const offsetDistance = leftDistance / 2;
this.leftLaser.position.add(new THREE.Vector3().copy(targetLocal).sub(this.leftEye.position).normalize().multiplyScalar(offsetDistance));
```

This calculation tries to offset the laser so its base is at the eye, but:
- Uses `targetLocal` (local space) but `leftEye.position` is already in local space
- The subtraction `targetLocal.sub(this.leftEye.position)` gives direction from eye to target
- But then it ADDS this to `leftLaser.position`, which was just set to `leftEye.position`
- This effectively moves the laser halfway to the target, not to the eye origin

**Visual Result:**
Lasers appear to start from a point halfway between the eye and the button, not from the eye itself.

**Fix Required:**
```javascript
// Cylinder is centered at origin, so offset by half its scaled length
const offsetDirection = leftDirection.clone().applyQuaternion(headWorldQuat.clone().invert()).normalize();
this.leftLaser.position.add(offsetDirection.multiplyScalar(leftDistance / 2));
```

---

### Issue #5: Missing Error Handling for THREE.js Load
**File:** `src/components/Megabot.tsx:29-51`
**Severity:** 🟠 Medium
**Impact:** Silent failure if Three.js fails to load

**Problem:**
```javascript
threeScript.onload = () => {
  if (containerRef.current && window.THREE) {
    megabotRef.current = new MegabotScene(containerRef.current, quality);
  }
};
```

No `onerror` handler. If Three.js fails to load (CDN down, network error, ad blocker), the user sees nothing and no error message appears in the console.

**Fix Required:**
```javascript
threeScript.onload = () => {
  if (containerRef.current && window.THREE) {
    megabotRef.current = new MegabotScene(containerRef.current, quality);
  }
};

threeScript.onerror = () => {
  console.error('❌ Failed to load Three.js from CDN');
  // Optionally: Show fallback or retry
};
```

---

## 🔵 LOW PRIORITY / OBSERVATIONS

### Observation #1: Button Animation CSS is Correctly Defined
**Status:** ✅ Working as expected

The scan-line and spark animations ARE properly defined:
- `animate-scan-line` animation: `/src/app/globals.css:44-63`
- `.spark` classes with flash animation: `/src/app/globals.css:66-110`
- `.steam-btn` styling: `/src/input.css:387-417`

These should work when the button is hovered IF the conditional rendering is correct.

### Observation #2: Conditional Rendering Looks Correct
**Status:** ✅ Working as expected

```javascript
{hoveredButton === 'steam' && (
  <div className="absolute inset-0 pointer-events-none">
    <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-scan-line" />
  </div>
)}
```

This should render when `hoveredButton` is set to 'steam' by `handleButtonHover`.

### Observation #3: Event Handlers Are Properly Attached
**Status:** ✅ Working as expected

```javascript
onMouseEnter={(e) => handleButtonHover('steam', e)}
onMouseMove={(e) => handleButtonHover('steam', e)}
onMouseLeave={handleButtonLeave}
onClick={handleButtonClick}
```

All handlers are correctly bound.

---

## 🎯 ROOT CAUSE ANALYSIS

### Why Laser Eyes Don't Track Button
1. **Mouse position never cleared** → Megabot receives stale coordinates after hover ends
2. **Plane intersection may fail** → targetPosition3D becomes null or (0,0,0)
3. **Inconsistent state checks** → Dual condition causes scanning mode when tracking expected

### Why Button Animations May Not Show
The button animations (scanning line, sparks) SHOULD work correctly based on code review. If they're not showing:
- Check if `hoveredButton` state is being set (add console.log)
- Verify CSS is being loaded (check Network tab)
- Ensure no CSS conflicts or z-index issues

---

## 📋 RECOMMENDED FIXES (Priority Order)

### 1. Fix handleButtonLeave (CRITICAL)
```javascript
const handleButtonLeave = () => {
  setHoveredButton(null);
  setMousePosition({ x: 0, y: 0 }); // or null, depending on type
  setButtonBounds(null);
};
```

### 2. Add Null Check for Plane Intersection (CRITICAL)
```javascript
const targetPos = new THREE.Vector3();
const intersection = raycaster.ray.intersectPlane(plane, targetPos);

if (intersection) {
  this.targetPosition3D = targetPos;
  console.log('🎯 Tracking target set:', {
    screen: `(${target.x}, ${target.y})`,
    world3D: `(${targetPos.x.toFixed(0)}, ${targetPos.y.toFixed(0)}, ${targetPos.z.toFixed(0)})`,
    hasLasers: !!(this.leftLaser && this.rightLaser)
  });
} else {
  console.warn('⚠️ Ray-plane intersection failed, falling back to scanning mode');
  this.targetPosition3D = null;
}
```

### 3. Simplify Tracking Condition (HIGH)
```javascript
// Change from dual-check to single source of truth
if (this.trackingTarget && this.targetPosition3D) {
  // TRACKING MODE
} else {
  // SCANNING MODE (includes case where plane intersection failed)
}
```

### 4. Fix Laser Position Offset (MEDIUM)
```javascript
// For left laser - position it so the base starts at eye
const leftQuaternion = new THREE.Quaternion();
leftQuaternion.setFromUnitVectors(upVector, leftDirection.clone().applyQuaternion(headWorldQuat.clone().invert()).normalize());
this.leftLaser.quaternion.copy(leftQuaternion);

// Offset by half the laser length in the direction it's pointing
const leftLocalDirection = leftDirection.clone().applyQuaternion(headWorldQuat.clone().invert()).normalize();
this.leftLaser.position.add(leftLocalDirection.multiplyScalar(leftDistance / 2));
```

### 5. Add Three.js Error Handling (MEDIUM)
```javascript
threeScript.onerror = () => {
  console.error('❌ Failed to load Three.js library');
};
```

---

## 🧪 TESTING CHECKLIST

After applying fixes, verify:
- [ ] Lasers scan by default when page loads
- [ ] Lasers lock onto Steam button on hover
- [ ] Sparks appear at button location when hovering
- [ ] Lasers return to scanning when mouse leaves button
- [ ] Red scanning line animates across button
- [ ] Corner sparks flash at button corners
- [ ] No console errors about null/undefined
- [ ] Lasers originate from megabot's eyes (not floating in space)
- [ ] Lasers point accurately at button (not offset)

---

## 📊 ISSUE SUMMARY

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 3 | Requires immediate fix |
| 🟠 Medium | 2 | Should fix before production |
| 🔵 Low | 0 | - |
| ✅ Working | 3 | No action needed |

---

## 💡 ADDITIONAL RECOMMENDATIONS

1. **Add Debug Mode:** Create a debug flag to show laser raycast visualizations
2. **Performance:** Consider throttling `onMouseMove` handler (currently fires on every pixel)
3. **Type Safety:** Update mousePosition type to `{ x: number; y: number } | null` for clarity
4. **Logging:** Remove or gate console.logs behind debug flag for production

---

**End of Audit Report**
