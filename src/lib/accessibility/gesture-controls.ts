/**
 * Gesture Controls System
 * Air gestures, touch gestures, and alternative input methods for accessibility
 */

export interface GestureEvent {
  type: string;
  gesture: string;
  confidence: number;
  position: { x: number; y: number };
  velocity?: { x: number; y: number };
  direction?: string;
  distance?: number;
  duration?: number;
  fingers?: number;
  pressure?: number;
  timestamp: number;
}

export interface GestureCommand {
  id: string;
  gesture: string;
  action: string;
  description: string;
  parameters?: Record<string, any>;
  enabled: boolean;
  sensitivity: number;
  inputMethods: ('touch' | 'mouse' | 'stylus' | 'camera' | 'accelerometer')[];
}

export interface AccessibilityPreferences {
  motorImpairment: boolean;
  tremor: boolean;
  limitedReach: boolean;
  oneHandedOperation: boolean;
  switchNavigation: boolean;
  headTracking: boolean;
  eyeTracking: boolean;
  voiceControl: boolean;
  gestureSize: 'small' | 'medium' | 'large';
  dwellTime: number; // milliseconds
  tapTimeout: number;
  holdDuration: number;
}

export class GestureControlsManager {
  private gestures: GestureCommand[] = [];
  private preferences: AccessibilityPreferences;
  private isActive = false;
  private onGestureCallback?: (event: GestureEvent) => void;

  // Camera-based gesture recognition
  private videoElement?: HTMLVideoElement;
  private canvas?: HTMLCanvasElement;
  private context?: CanvasRenderingContext2D;
  private handTracker?: any; // MediaPipe Hands or similar

  // Touch/mouse tracking
  private touchPoints: Map<number, { x: number; y: number; timestamp: number }> = new Map();
  private mousePosition = { x: 0, y: 0 };
  private lastGesture?: GestureEvent;

  // Switch navigation
  private switchInputs: Map<string, { pressed: boolean; timestamp: number }> = new Map();
  private dwellTimer?: NodeJS.Timeout;

  constructor(preferences?: Partial<AccessibilityPreferences>) {
    this.preferences = {
      motorImpairment: false,
      tremor: false,
      limitedReach: false,
      oneHandedOperation: false,
      switchNavigation: false,
      headTracking: false,
      eyeTracking: false,
      voiceControl: false,
      gestureSize: 'medium',
      dwellTime: 1000,
      tapTimeout: 300,
      holdDuration: 500,
      ...preferences
    };

    this.setupGestureCommands();
    this.initializeInputMethods();
  }

  /**
   * Setup gesture commands for audio editing
   */
  private setupGestureCommands(): void {
    this.gestures = [
      // Playback controls
      {
        id: 'play_pause',
        gesture: 'tap_center',
        action: 'playback.toggle',
        description: 'Play or pause audio',
        enabled: true,
        sensitivity: 0.8,
        inputMethods: ['touch', 'mouse', 'camera']
      },
      {
        id: 'play_pause_wave',
        gesture: 'wave_hand',
        action: 'playback.toggle',
        description: 'Wave hand to play/pause',
        enabled: true,
        sensitivity: 0.7,
        inputMethods: ['camera']
      },
      {
        id: 'volume_up',
        gesture: 'swipe_up',
        action: 'audio.volume_up',
        description: 'Increase volume',
        enabled: true,
        sensitivity: 0.8,
        inputMethods: ['touch', 'camera']
      },
      {
        id: 'volume_down',
        gesture: 'swipe_down',
        action: 'audio.volume_down',
        description: 'Decrease volume',
        enabled: true,
        sensitivity: 0.8,
        inputMethods: ['touch', 'camera']
      },

      // Seeking and navigation
      {
        id: 'seek_forward',
        gesture: 'swipe_right',
        action: 'playback.seek_forward',
        description: 'Seek forward',
        parameters: { seconds: 10 },
        enabled: true,
        sensitivity: 0.7,
        inputMethods: ['touch', 'camera']
      },
      {
        id: 'seek_backward',
        gesture: 'swipe_left',
        action: 'playback.seek_backward',
        description: 'Seek backward',
        parameters: { seconds: 10 },
        enabled: true,
        sensitivity: 0.7,
        inputMethods: ['touch', 'camera']
      },
      {
        id: 'precision_seek',
        gesture: 'point_and_hold',
        action: 'playback.seek_to_position',
        description: 'Point to seek to specific position',
        enabled: true,
        sensitivity: 0.9,
        inputMethods: ['camera', 'touch']
      },

      // Track controls
      {
        id: 'select_track',
        gesture: 'point_at_track',
        action: 'track.select',
        description: 'Point to select track',
        enabled: true,
        sensitivity: 0.8,
        inputMethods: ['camera', 'touch']
      },
      {
        id: 'mute_track',
        gesture: 'cover_track',
        action: 'track.mute',
        description: 'Cover track to mute',
        enabled: true,
        sensitivity: 0.8,
        inputMethods: ['camera']
      },
      {
        id: 'double_tap_solo',
        gesture: 'double_tap',
        action: 'track.solo',
        description: 'Double tap to solo track',
        enabled: true,
        sensitivity: 0.8,
        inputMethods: ['touch']
      },

      // Editing gestures
      {
        id: 'cut_selection',
        gesture: 'scissors_gesture',
        action: 'edit.cut',
        description: 'Scissors gesture to cut selection',
        enabled: true,
        sensitivity: 0.8,
        inputMethods: ['camera']
      },
      {
        id: 'copy_gesture',
        gesture: 'pinch_and_hold',
        action: 'edit.copy',
        description: 'Pinch and hold to copy',
        enabled: true,
        sensitivity: 0.7,
        inputMethods: ['touch', 'camera']
      },
      {
        id: 'paste_gesture',
        gesture: 'open_palm',
        action: 'edit.paste',
        description: 'Open palm to paste',
        enabled: true,
        sensitivity: 0.8,
        inputMethods: ['camera']
      },

      // Zoom and view controls
      {
        id: 'zoom_in',
        gesture: 'pinch_out',
        action: 'view.zoom_in',
        description: 'Pinch out to zoom in',
        enabled: true,
        sensitivity: 0.8,
        inputMethods: ['touch', 'camera']
      },
      {
        id: 'zoom_out',
        gesture: 'pinch_in',
        action: 'view.zoom_out',
        description: 'Pinch in to zoom out',
        enabled: true,
        sensitivity: 0.8,
        inputMethods: ['touch', 'camera']
      },

      // Accessibility-specific gestures
      {
        id: 'dwell_click',
        gesture: 'dwell',
        action: 'ui.click',
        description: 'Dwell to click (for motor impairments)',
        enabled: this.preferences.motorImpairment,
        sensitivity: 0.9,
        inputMethods: ['camera', 'mouse']
      },
      {
        id: 'switch_next',
        gesture: 'switch_1',
        action: 'navigation.next',
        description: 'Switch 1: Navigate to next element',
        enabled: this.preferences.switchNavigation,
        sensitivity: 1.0,
        inputMethods: ['mouse'] // Switch inputs via mouse events
      },
      {
        id: 'switch_select',
        gesture: 'switch_2',
        action: 'navigation.select',
        description: 'Switch 2: Select current element',
        enabled: this.preferences.switchNavigation,
        sensitivity: 1.0,
        inputMethods: ['mouse']
      },
      {
        id: 'head_nod',
        gesture: 'nod_yes',
        action: 'ui.confirm',
        description: 'Nod to confirm action',
        enabled: this.preferences.headTracking,
        sensitivity: 0.7,
        inputMethods: ['camera']
      },
      {
        id: 'head_shake',
        gesture: 'shake_no',
        action: 'ui.cancel',
        description: 'Shake head to cancel',
        enabled: this.preferences.headTracking,
        sensitivity: 0.7,
        inputMethods: ['camera']
      }
    ];
  }

  /**
   * Initialize input methods based on preferences
   */
  private async initializeInputMethods(): Promise<void> {
    // Initialize camera-based gesture recognition
    if (this.preferences.headTracking || this.preferences.eyeTracking ||
        this.gestures.some(g => g.inputMethods.includes('camera'))) {
      await this.initializeCameraTracking();
    }

    // Initialize touch/mouse tracking
    this.initializeTouchTracking();

    // Initialize switch navigation
    if (this.preferences.switchNavigation) {
      this.initializeSwitchNavigation();
    }

    // Initialize accelerometer (for device tilting)
    if ('DeviceOrientationEvent' in window) {
      this.initializeAccelerometer();
    }

    console.log('🫴 Gesture controls initialized with accessibility preferences');
  }

  /**
   * Initialize camera-based hand/head tracking
   */
  private async initializeCameraTracking(): Promise<void> {
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user' // Front camera for gestures
        }
      });

      // Create video element
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = stream;
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.videoElement.style.position = 'fixed';
      this.videoElement.style.top = '-1000px'; // Hide video element
      document.body.appendChild(this.videoElement);

      // Create canvas for processing
      this.canvas = document.createElement('canvas');
      this.canvas.width = 640;
      this.canvas.height = 480;
      this.context = this.canvas.getContext('2d')!;

      // Initialize hand/face tracking (would use MediaPipe or similar library)
      await this.initializeHandTracking();

      console.log('📹 Camera tracking initialized');
    } catch (error) {
      console.error('Failed to initialize camera tracking:', error);
    }
  }

  /**
   * Initialize hand tracking (placeholder for MediaPipe Hands)
   */
  private async initializeHandTracking(): Promise<void> {
    // In a real implementation, you would initialize MediaPipe Hands here
    // For now, we'll simulate with basic motion detection

    if (!this.videoElement || !this.canvas || !this.context) return;

    let previousFrame: ImageData | null = null;

    const processFrame = () => {
      if (!this.isActive) return;

      this.context!.drawImage(this.videoElement!, 0, 0, 640, 480);
      const currentFrame = this.context!.getImageData(0, 0, 640, 480);

      if (previousFrame) {
        const motionData = this.detectMotion(previousFrame, currentFrame);
        this.processMotionGestures(motionData);
      }

      previousFrame = currentFrame;
      requestAnimationFrame(processFrame);
    };

    processFrame();
  }

  /**
   * Detect motion between frames
   */
  private detectMotion(previous: ImageData, current: ImageData): {
    intensity: number;
    centerOfMotion: { x: number; y: number };
    direction: string;
  } {
    const data1 = previous.data;
    const data2 = current.data;
    let totalDiff = 0;
    let motionPixels = 0;
    let centerX = 0;
    let centerY = 0;

    for (let i = 0; i < data1.length; i += 4) {
      const diff = Math.abs(data1[i] - data2[i]) +
                   Math.abs(data1[i + 1] - data2[i + 1]) +
                   Math.abs(data1[i + 2] - data2[i + 2]);

      if (diff > 30) { // Motion threshold
        totalDiff += diff;
        motionPixels++;
        const pixelIndex = i / 4;
        const x = pixelIndex % 640;
        const y = Math.floor(pixelIndex / 640);
        centerX += x;
        centerY += y;
      }
    }

    const intensity = totalDiff / (640 * 480 * 3);
    const center = motionPixels > 0 ?
      { x: centerX / motionPixels, y: centerY / motionPixels } :
      { x: 0, y: 0 };

    // Determine primary direction
    let direction = 'none';
    if (center.x > 400) direction = 'right';
    else if (center.x < 240) direction = 'left';
    else if (center.y < 200) direction = 'up';
    else if (center.y > 280) direction = 'down';
    else direction = 'center';

    return { intensity, centerOfMotion: center, direction };
  }

  /**
   * Process motion data into gestures
   */
  private processMotionGestures(motionData: {
    intensity: number;
    centerOfMotion: { x: number; y: number };
    direction: string;
  }): void {
    const { intensity, centerOfMotion, direction } = motionData;

    // Simple gesture recognition based on motion intensity and direction
    if (intensity > 0.1) {
      let gestureType = 'unknown';

      if (intensity > 0.3) {
        // High motion - likely a gesture
        switch (direction) {
          case 'left':
            gestureType = 'swipe_left';
            break;
          case 'right':
            gestureType = 'swipe_right';
            break;
          case 'up':
            gestureType = 'swipe_up';
            break;
          case 'down':
            gestureType = 'swipe_down';
            break;
          case 'center':
            gestureType = 'wave_hand';
            break;
        }
      } else if (intensity > 0.05) {
        // Medium motion - pointing or hovering
        gestureType = 'point_and_hold';
      }

      if (gestureType !== 'unknown') {
        this.processGesture({
          type: 'camera',
          gesture: gestureType,
          confidence: Math.min(intensity * 2, 1),
          position: centerOfMotion,
          direction,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Initialize touch and mouse tracking
   */
  private initializeTouchTracking(): void {
    // Touch events
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

    // Mouse events (for accessibility devices that emulate mouse)
    document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    // Pointer events (for stylus and other input devices)
    document.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    document.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    document.addEventListener('pointerup', (e) => this.handlePointerUp(e));
  }

  /**
   * Initialize switch navigation
   */
  private initializeSwitchNavigation(): void {
    // Listen for switch inputs (typically mapped to specific keys)
    document.addEventListener('keydown', (e) => {
      if (this.preferences.switchNavigation) {
        this.handleSwitchInput(e);
      }
    });

    // External switch devices often use specific key codes
    const switchKeyCodes = ['Space', 'Enter', 'NumpadEnter', 'F1', 'F2'];

    switchKeyCodes.forEach((keyCode, index) => {
      this.switchInputs.set(`switch_${index + 1}`, { pressed: false, timestamp: 0 });
    });
  }

  /**
   * Initialize device accelerometer for tilt gestures
   */
  private initializeAccelerometer(): void {
    if (typeof DeviceOrientationEvent !== 'undefined') {
      window.addEventListener('deviceorientation', (e) => {
        this.handleDeviceOrientation(e);
      });
    }
  }

  /**
   * Handle touch events
   */
  private handleTouchStart(e: TouchEvent): void {
    Array.from(e.touches).forEach((touch) => {
      this.touchPoints.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now()
      });
    });

    // Detect gesture based on number of touches
    if (e.touches.length === 1) {
      // Single touch - potential tap or swipe
      this.startGestureDetection('tap', e.touches[0]);
    } else if (e.touches.length === 2) {
      // Two touches - potential pinch
      this.startGestureDetection('pinch', e.touches[0]);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    // Update touch positions and detect swipes/pinches
    Array.from(e.touches).forEach((touch) => {
      const startPoint = this.touchPoints.get(touch.identifier);
      if (startPoint) {
        const deltaX = touch.clientX - startPoint.x;
        const deltaY = touch.clientY - startPoint.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > 50) { // Minimum distance for gesture
          this.detectSwipeGesture(deltaX, deltaY, touch);
        }
      }
    });
  }

  private handleTouchEnd(e: TouchEvent): void {
    // Process completed gestures
    Array.from(e.changedTouches).forEach((touch) => {
      const startPoint = this.touchPoints.get(touch.identifier);
      if (startPoint) {
        const duration = Date.now() - startPoint.timestamp;
        const deltaX = touch.clientX - startPoint.x;
        const deltaY = touch.clientY - startPoint.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance < 10 && duration < this.preferences.tapTimeout) {
          // Tap gesture
          this.processGesture({
            type: 'touch',
            gesture: 'tap_center',
            confidence: 0.9,
            position: { x: touch.clientX, y: touch.clientY },
            duration,
            timestamp: Date.now()
          });
        }
      }

      this.touchPoints.delete(touch.identifier);
    });
  }

  /**
   * Handle mouse events (including switch devices)
   */
  private handleMouseDown(e: MouseEvent): void {
    this.mousePosition = { x: e.clientX, y: e.clientY };

    // Check if this might be a dwell click
    if (this.preferences.motorImpairment) {
      this.startDwellTimer(e.clientX, e.clientY);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    this.mousePosition = { x: e.clientX, y: e.clientY };

    // Cancel dwell timer if mouse moves significantly
    if (this.dwellTimer) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - this.mousePosition.x, 2) +
        Math.pow(e.clientY - this.mousePosition.y, 2)
      );

      if (distance > 10) {
        clearTimeout(this.dwellTimer);
        this.dwellTimer = undefined;
      }
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (this.dwellTimer) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = undefined;
    }
  }

  /**
   * Handle pointer events for stylus and advanced input
   */
  private handlePointerDown(e: PointerEvent): void {
    // Enhanced gesture detection for stylus with pressure sensitivity
    if (e.pointerType === 'pen') {
      this.processGesture({
        type: 'stylus',
        gesture: 'stylus_tap',
        confidence: 0.9,
        position: { x: e.clientX, y: e.clientY },
        pressure: e.pressure,
        timestamp: Date.now()
      });
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    // Track stylus movement for precision gestures
    if (e.pointerType === 'pen' && e.pressure > 0.5) {
      // High pressure stylus gesture
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    // Complete stylus gestures
  }

  /**
   * Handle switch input events
   */
  private handleSwitchInput(e: KeyboardEvent): void {
    const switchMap: Record<string, string> = {
      'Space': 'switch_1',
      'Enter': 'switch_2',
      'NumpadEnter': 'switch_2',
      'F1': 'switch_3',
      'F2': 'switch_4'
    };

    const switchId = switchMap[e.code];
    if (switchId) {
      e.preventDefault();

      this.processGesture({
        type: 'switch',
        gesture: switchId,
        confidence: 1.0,
        position: this.mousePosition,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle device orientation for tilt gestures
   */
  private handleDeviceOrientation(e: DeviceOrientationEvent): void {
    if (e.gamma !== null && e.beta !== null) {
      // Detect significant tilt gestures
      const tiltX = Math.abs(e.gamma) > 30; // Left/right tilt
      const tiltY = Math.abs(e.beta) > 30;  // Forward/back tilt

      if (tiltX || tiltY) {
        const direction = tiltX ?
          (e.gamma! > 0 ? 'tilt_right' : 'tilt_left') :
          (e.beta! > 0 ? 'tilt_forward' : 'tilt_back');

        this.processGesture({
          type: 'accelerometer',
          gesture: direction,
          confidence: 0.8,
          position: { x: 0, y: 0 },
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Start dwell timer for motor-impaired users
   */
  private startDwellTimer(x: number, y: number): void {
    this.dwellTimer = setTimeout(() => {
      this.processGesture({
        type: 'dwell',
        gesture: 'dwell',
        confidence: 1.0,
        position: { x, y },
        duration: this.preferences.dwellTime,
        timestamp: Date.now()
      });
    }, this.preferences.dwellTime);
  }

  /**
   * Detect swipe gestures from touch delta
   */
  private detectSwipeGesture(deltaX: number, deltaY: number, touch: Touch): void {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    let gestureType = '';
    if (absX > absY) {
      gestureType = deltaX > 0 ? 'swipe_right' : 'swipe_left';
    } else {
      gestureType = deltaY > 0 ? 'swipe_down' : 'swipe_up';
    }

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const confidence = Math.min(distance / 200, 1); // Normalize to 0-1

    this.processGesture({
      type: 'touch',
      gesture: gestureType,
      confidence,
      position: { x: touch.clientX, y: touch.clientY },
      velocity: { x: deltaX, y: deltaY },
      direction: gestureType.split('_')[1],
      distance,
      timestamp: Date.now()
    });
  }

  /**
   * Start gesture detection with debouncing
   */
  private startGestureDetection(gestureType: string, touch: Touch): void {
    // Implement gesture detection logic
  }

  /**
   * Process detected gesture
   */
  private processGesture(event: GestureEvent): void {
    // Find matching gesture command
    const command = this.gestures.find(g =>
      g.enabled &&
      g.gesture === event.gesture &&
      g.inputMethods.includes(event.type as any) &&
      event.confidence >= (g.sensitivity * 0.7) // Allow some tolerance
    );

    if (command) {
      console.log(`🫴 Gesture recognized: ${command.gesture} -> ${command.action}`);

      // Prevent duplicate gestures
      if (this.lastGesture &&
          this.lastGesture.gesture === event.gesture &&
          (event.timestamp - this.lastGesture.timestamp) < 500) {
        return;
      }

      this.lastGesture = event;

      if (this.onGestureCallback) {
        this.onGestureCallback(event);
      }

      // Execute gesture command
      this.executeGestureCommand(command, event);
    }
  }

  /**
   * Execute gesture command
   */
  private executeGestureCommand(command: GestureCommand, event: GestureEvent): void {
    // This would be implemented by the consuming application
    console.log(`Executing gesture command: ${command.action}`);

    // Provide haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  /**
   * Start gesture recognition
   */
  start(): void {
    this.isActive = true;
    console.log('🫴 Gesture controls activated');
  }

  /**
   * Stop gesture recognition
   */
  stop(): void {
    this.isActive = false;

    if (this.dwellTimer) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = undefined;
    }

    console.log('🫴 Gesture controls deactivated');
  }

  /**
   * Set gesture callback
   */
  onGesture(callback: (event: GestureEvent) => void): void {
    this.onGestureCallback = callback;
  }

  /**
   * Update accessibility preferences
   */
  updatePreferences(preferences: Partial<AccessibilityPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };

    // Update gesture availability based on preferences
    this.gestures.forEach(gesture => {
      if (gesture.id.includes('dwell')) {
        gesture.enabled = this.preferences.motorImpairment;
      }
      if (gesture.id.includes('switch')) {
        gesture.enabled = this.preferences.switchNavigation;
      }
      if (gesture.id.includes('head')) {
        gesture.enabled = this.preferences.headTracking;
      }
    });

    console.log('🫴 Gesture preferences updated');
  }

  /**
   * Get available gestures
   */
  getAvailableGestures(): GestureCommand[] {
    return this.gestures.filter(g => g.enabled);
  }

  /**
   * Add custom gesture
   */
  addGesture(gesture: GestureCommand): void {
    this.gestures.push(gesture);
  }

  /**
   * Remove gesture
   */
  removeGesture(gestureId: string): void {
    this.gestures = this.gestures.filter(g => g.id !== gestureId);
  }

  /**
   * Check if camera/microphone permissions are available
   */
  async checkPermissions(): Promise<{
    camera: boolean;
    microphone: boolean;
    accelerometer: boolean;
  }> {
    const permissions = {
      camera: false,
      microphone: false,
      accelerometer: false
    };

    try {
      const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      permissions.camera = cameraPermission.state === 'granted';
    } catch (e) {
      console.warn('Camera permission check failed');
    }

    try {
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      permissions.microphone = micPermission.state === 'granted';
    } catch (e) {
      console.warn('Microphone permission check failed');
    }

    permissions.accelerometer = 'DeviceOrientationEvent' in window;

    return permissions;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stop();

    // Stop camera stream
    if (this.videoElement && this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }

    // Remove video element
    if (this.videoElement && this.videoElement.parentNode) {
      this.videoElement.parentNode.removeChild(this.videoElement);
    }

    console.log('🫴 Gesture controls cleanup complete');
  }
}