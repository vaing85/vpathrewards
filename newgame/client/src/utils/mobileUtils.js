/**
 * Mobile Utilities
 * 
 * Helper functions for mobile device detection and optimization
 */

/**
 * Check if device is mobile
 */
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth <= 768;
};

/**
 * Check if device is touch-enabled
 */
export const isTouchDevice = () => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
};

/**
 * Get viewport dimensions
 */
export const getViewportSize = () => {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
};

/**
 * Add mobile class to body if on mobile
 */
export const initMobileDetection = () => {
  if (isMobile()) {
    document.body.classList.add('mobile-device');
  }
  if (isTouchDevice()) {
    document.body.classList.add('touch-device');
  }
};

/**
 * Prevent zoom on double tap (iOS)
 */
export const preventDoubleTapZoom = () => {
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    false
  );
};

