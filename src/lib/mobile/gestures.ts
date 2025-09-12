// Mobile gesture handling utilities for touch-first audio controls

export interface TouchPosition {
  x: number;
  y: number;
}

export interface GestureEvent {
  type: 'tap' | 'longpress' | 'swipe' | 'pinch' | 'pan';
  position: TouchPosition;
  deltaX?: number;
  deltaY?: number;
  scale?: number;
  velocity?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export interface GestureOptions {
  tapThreshold?: number;
  longPressDelay?: number;
  swipeThreshold?: number;
  pinchThreshold?: number;
  preventScroll?: boolean;
}

export class GestureHandler {
  private element: HTMLElement;
  private options: Required<GestureOptions>;
  private callbacks: Map<string, (event: GestureEvent) => void>;
  
  private startTouch: TouchPosition | null = null;
  private startTouches: Touch[] = [];
  private startDistance: number = 0;
  private startScale: number = 1;
  private longPressTimer: NodeJS.Timeout | null = null;
  private isLongPress: boolean = false;
  private isPinching: boolean = false;
  
  constructor(element: HTMLElement, options: GestureOptions = {}) {
    this.element = element;
    this.options = {
      tapThreshold: options.tapThreshold ?? 10,
      longPressDelay: options.longPressDelay ?? 500,
      swipeThreshold: options.swipeThreshold ?? 50,
      pinchThreshold: options.pinchThreshold ?? 0.1,
      preventScroll: options.preventScroll ?? false,
    };
    
    this.callbacks = new Map();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Touch events
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
    
    // Mouse events for desktop compatibility
    this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.element.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.element.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.element.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    
    // Prevent context menu on long press
    this.element.addEventListener('contextmenu', (e) => {
      if (this.isLongPress) {
        e.preventDefault();
      }
    });
  }

  private handleTouchStart(event: TouchEvent) {
    if (this.options.preventScroll) {
      event.preventDefault();
    }

    const touches = Array.from(event.touches);
    this.startTouches = touches;

    if (touches.length === 1) {
      // Single touch
      const touch = touches[0];
      this.startTouch = { x: touch.clientX, y: touch.clientY };
      this.isLongPress = false;
      
      // Start long press timer
      this.longPressTimer = setTimeout(() => {
        this.isLongPress = true;
        this.triggerCallback('longpress', {
          type: 'longpress',
          position: this.startTouch!,
        });
      }, this.options.longPressDelay);
      
    } else if (touches.length === 2) {
      // Two finger pinch/zoom
      this.isPinching = true;
      this.startDistance = this.getTouchDistance(touches[0], touches[1]);
      this.startScale = 1;
      this.clearLongPressTimer();
    }
  }

  private handleTouchMove(event: TouchEvent) {
    if (this.options.preventScroll) {
      event.preventDefault();
    }

    const touches = Array.from(event.touches);

    if (touches.length === 1 && this.startTouch) {
      const touch = touches[0];
      const deltaX = touch.clientX - this.startTouch.x;
      const deltaY = touch.clientY - this.startTouch.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Cancel long press if moved too much
      if (distance > this.options.tapThreshold) {
        this.clearLongPressTimer();
      }

      // Trigger pan gesture
      this.triggerCallback('pan', {
        type: 'pan',
        position: { x: touch.clientX, y: touch.clientY },
        deltaX,
        deltaY,
      });

    } else if (touches.length === 2 && this.isPinching) {
      const distance = this.getTouchDistance(touches[0], touches[1]);
      const scale = distance / this.startDistance;

      if (Math.abs(scale - this.startScale) > this.options.pinchThreshold) {
        this.triggerCallback('pinch', {
          type: 'pinch',
          position: this.getTouchCenter(touches[0], touches[1]),
          scale,
        });
        this.startScale = scale;
      }
    }
  }

  private handleTouchEnd(event: TouchEvent) {
    const touches = Array.from(event.changedTouches);

    if (touches.length === 1 && this.startTouch && !this.isLongPress) {
      const touch = touches[0];
      const deltaX = touch.clientX - this.startTouch.x;
      const deltaY = touch.clientY - this.startTouch.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < this.options.tapThreshold) {
        // Tap gesture
        this.triggerCallback('tap', {
          type: 'tap',
          position: { x: touch.clientX, y: touch.clientY },
        });
      } else if (distance > this.options.swipeThreshold) {
        // Swipe gesture
        const direction = this.getSwipeDirection(deltaX, deltaY);
        const velocity = this.calculateVelocity(distance);

        this.triggerCallback('swipe', {
          type: 'swipe',
          position: { x: touch.clientX, y: touch.clientY },
          deltaX,
          deltaY,
          direction,
          velocity,
        });
      }
    }

    this.cleanup();
  }

  private handleTouchCancel() {
    this.cleanup();
  }

  // Mouse event handlers for desktop compatibility
  private mousePressed = false;
  private startMouse: TouchPosition | null = null;

  private handleMouseDown(event: MouseEvent) {
    this.mousePressed = true;
    this.startMouse = { x: event.clientX, y: event.clientY };
    this.isLongPress = false;

    this.longPressTimer = setTimeout(() => {
      if (this.mousePressed) {
        this.isLongPress = true;
        this.triggerCallback('longpress', {
          type: 'longpress',
          position: this.startMouse!,
        });
      }
    }, this.options.longPressDelay);
  }

  private handleMouseMove(event: MouseEvent) {
    if (!this.mousePressed || !this.startMouse) return;

    const deltaX = event.clientX - this.startMouse.x;
    const deltaY = event.clientY - this.startMouse.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > this.options.tapThreshold) {
      this.clearLongPressTimer();
    }

    this.triggerCallback('pan', {
      type: 'pan',
      position: { x: event.clientX, y: event.clientY },
      deltaX,
      deltaY,
    });
  }

  private handleMouseUp(event: MouseEvent) {
    if (!this.mousePressed || !this.startMouse) return;

    if (!this.isLongPress) {
      const deltaX = event.clientX - this.startMouse.x;
      const deltaY = event.clientY - this.startMouse.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < this.options.tapThreshold) {
        this.triggerCallback('tap', {
          type: 'tap',
          position: { x: event.clientX, y: event.clientY },
        });
      } else if (distance > this.options.swipeThreshold) {
        const direction = this.getSwipeDirection(deltaX, deltaY);
        const velocity = this.calculateVelocity(distance);

        this.triggerCallback('swipe', {
          type: 'swipe',
          position: { x: event.clientX, y: event.clientY },
          deltaX,
          deltaY,
          direction,
          velocity,
        });
      }
    }

    this.mousePressed = false;
    this.startMouse = null;
    this.clearLongPressTimer();
    this.isLongPress = false;
  }

  private handleMouseLeave() {
    this.mousePressed = false;
    this.startMouse = null;
    this.clearLongPressTimer();
    this.isLongPress = false;
  }

  // Utility methods
  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getTouchCenter(touch1: Touch, touch2: Touch): TouchPosition {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }

  private getSwipeDirection(deltaX: number, deltaY: number): 'up' | 'down' | 'left' | 'right' {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > absY) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  private calculateVelocity(distance: number): number {
    // Simple velocity calculation (pixels per ms)
    return distance / this.options.longPressDelay;
  }

  private clearLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private cleanup() {
    this.startTouch = null;
    this.startTouches = [];
    this.isPinching = false;
    this.isLongPress = false;
    this.clearLongPressTimer();
  }

  private triggerCallback(eventType: string, event: GestureEvent) {
    const callback = this.callbacks.get(eventType);
    if (callback) {
      callback(event);
    }
  }

  // Public API
  public on(eventType: string, callback: (event: GestureEvent) => void) {
    this.callbacks.set(eventType, callback);
    return this;
  }

  public off(eventType: string) {
    this.callbacks.delete(eventType);
    return this;
  }

  public destroy() {
    this.cleanup();
    this.callbacks.clear();
    
    // Remove all event listeners
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
    this.element.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.element.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.element.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.element.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
  }
}

// Hook for React components
import React from 'react';

export function useGestures(
  ref: React.RefObject<HTMLElement>,
  options: GestureOptions = {}
) {
  const [gestureHandler, setGestureHandler] = React.useState<GestureHandler | null>(null);

  React.useEffect(() => {
    if (ref.current) {
      const handler = new GestureHandler(ref.current, options);
      setGestureHandler(handler);

      return () => {
        handler.destroy();
        setGestureHandler(null);
      };
    }
  }, [ref.current, options]);

  return gestureHandler;
}