// Touch gesture utilities for swipe navigation
// Provides minimalista and fluid swipe detection for cryptocurrency navigation

export interface SwipeConfig {
  minSwipeDistance: number;
  maxSwipeTime: number;
  preventScroll: boolean;
}

export interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeStart?: (event: TouchEvent) => void;
  onSwipeEnd?: (event: TouchEvent) => void;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

const DEFAULT_CONFIG: SwipeConfig = {
  minSwipeDistance: 50,     // Minimum distance in pixels for a valid swipe
  maxSwipeTime: 300,        // Maximum time in ms for a valid swipe
  preventScroll: true       // Prevent vertical scrolling during horizontal swipes
};

export function setupSwipeGestures(
  element: HTMLElement,
  callbacks: SwipeCallbacks,
  config: Partial<SwipeConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let startTouch: TouchPoint | null = null;
  let isHorizontalSwipe = false;

  function getTouchPoint(event: TouchEvent): TouchPoint {
    const touch = event.touches[0] || event.changedTouches[0];
    return {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }

  function handleTouchStart(event: TouchEvent) {
    startTouch = getTouchPoint(event);
    isHorizontalSwipe = false;
    callbacks.onSwipeStart?.(event);
  }

  function handleTouchMove(event: TouchEvent) {
    if (!startTouch) return;

    const currentTouch = getTouchPoint(event);
    const deltaX = Math.abs(currentTouch.x - startTouch.x);
    const deltaY = Math.abs(currentTouch.y - startTouch.y);

    // Determine if this is a horizontal swipe
    if (deltaX > deltaY && deltaX > 10) {
      isHorizontalSwipe = true;
    }

    // Prevent vertical scrolling during horizontal swipes
    if (finalConfig.preventScroll && isHorizontalSwipe) {
      event.preventDefault();
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    if (!startTouch) return;

    const endTouch = getTouchPoint(event);
    const deltaX = endTouch.x - startTouch.x;
    const deltaY = Math.abs(endTouch.y - startTouch.y);
    const distance = Math.abs(deltaX);
    const duration = endTouch.time - startTouch.time;

    // Check if it's a valid swipe
    const isValidSwipe = 
      distance >= finalConfig.minSwipeDistance &&
      duration <= finalConfig.maxSwipeTime &&
      distance > deltaY * 1.5; // Ensure it's more horizontal than vertical

    if (isValidSwipe) {
      if (deltaX > 0) {
        // Swipe right (previous crypto)
        callbacks.onSwipeRight?.();
      } else {
        // Swipe left (next crypto)
        callbacks.onSwipeLeft?.();
      }
    }

    callbacks.onSwipeEnd?.(event);
    startTouch = null;
    isHorizontalSwipe = false;
  }

  // Add event listeners
  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });
  element.addEventListener('touchend', handleTouchEnd, { passive: false });

  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
  };
}

// Utility function to check if device supports touch
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
