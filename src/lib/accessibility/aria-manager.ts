/**
 * ARIA Accessibility Manager
 * Comprehensive ARIA support for screen readers and assistive technologies
 */

export interface AriaLabel {
  element: HTMLElement;
  role?: string;
  label: string;
  description?: string;
  expanded?: boolean;
  pressed?: boolean;
  checked?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  level?: number;
  current?: string;
  orientation?: 'horizontal' | 'vertical';
  valueNow?: number;
  valueMin?: number;
  valueMax?: number;
  valueText?: string;
  live?: 'off' | 'polite' | 'assertive';
  atomic?: boolean;
  relevant?: string;
  controls?: string;
  describedBy?: string;
  labelledBy?: string;
  owns?: string;
  flowTo?: string;
  posInSet?: number;
  setSize?: number;
}

export interface AriaAnnouncement {
  id: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
  type: 'status' | 'alert' | 'log' | 'marquee' | 'timer';
}

export interface FocusableElement {
  element: HTMLElement;
  tabIndex: number;
  originalTabIndex?: number;
  group?: string;
  skipLink?: boolean;
}

export interface AriaAccessibilityState {
  announcements: AriaAnnouncement[];
  focusableElements: FocusableElement[];
  currentFocus?: HTMLElement;
  focusTraps: HTMLElement[];
  screenReaderMode: boolean;
  highContrastMode: boolean;
  reducedMotion: boolean;
  increasedTextSize: boolean;
}

export class AriaManager {
  private state: AriaAccessibilityState = {
    announcements: [],
    focusableElements: [],
    focusTraps: [],
    screenReaderMode: false,
    highContrastMode: false,
    reducedMotion: false,
    increasedTextSize: false
  };

  private liveRegions: Map<string, HTMLElement> = new Map();
  private keyboardShortcuts: Map<string, { callback: () => void; description: string }> = new Map();
  private focusHistory: HTMLElement[] = [];

  constructor() {
    this.initializeAriaSupport();
    this.detectAccessibilityPreferences();
    this.setupKeyboardNavigation();
    this.createLiveRegions();
  }

  /**
   * Initialize comprehensive ARIA support
   */
  private initializeAriaSupport(): void {
    // Add skip links for main content navigation
    this.addSkipLinks();

    // Set up focus management
    this.setupFocusManagement();

    // Initialize screen reader detection
    this.detectScreenReader();

    // Set up landmark roles
    this.setupLandmarks();

    // Initialize audio-specific accessibility
    this.setupAudioAccessibility();

    console.log('♿ ARIA accessibility manager initialized');
  }

  /**
   * Detect user accessibility preferences
   */
  private detectAccessibilityPreferences(): void {
    // Detect reduced motion preference
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.state.reducedMotion = reducedMotion;

    // Detect high contrast preference
    const highContrast = window.matchMedia('(prefers-contrast: high)').matches ||
                        window.matchMedia('(prefers-contrast: more)').matches;
    this.state.highContrastMode = highContrast;

    // Detect screen reader usage
    this.state.screenReaderMode = this.detectScreenReader();

    // Apply accessibility modifications
    if (reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    }

    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    }

    // Listen for changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.state.reducedMotion = e.matches;
      document.documentElement.classList.toggle('reduce-motion', e.matches);
    });

    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      this.state.highContrastMode = e.matches;
      document.documentElement.classList.toggle('high-contrast', e.matches);
    });
  }

  /**
   * Detect if screen reader is active
   */
  private detectScreenReader(): boolean {
    // Check for common screen reader APIs
    const hasScreenReader = !!(
      (window as any).speechSynthesis ||
      (window as any).navigator?.userAgent.includes('NVDA') ||
      (window as any).navigator?.userAgent.includes('JAWS') ||
      (window as any).navigator?.userAgent.includes('VoiceOver') ||
      (window as any).navigator?.userAgent.includes('Orca') ||
      document.body.classList.contains('screenreader-text')
    );

    return hasScreenReader;
  }

  /**
   * Add skip links for keyboard navigation
   */
  private addSkipLinks(): void {
    const skipLinks = document.createElement('div');
    skipLinks.className = 'skip-links';
    skipLinks.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#audio-controls" class="skip-link">Skip to audio controls</a>
      <a href="#timeline" class="skip-link">Skip to timeline</a>
      <a href="#track-list" class="skip-link">Skip to track list</a>
      <a href="#navigation" class="skip-link">Skip to navigation</a>
    `;

    // Insert at beginning of body
    document.body.insertBefore(skipLinks, document.body.firstChild);

    // Style skip links
    this.addSkipLinkStyles();
  }

  /**
   * Setup focus management
   */
  private setupFocusManagement(): void {
    // Track all focusable elements
    this.updateFocusableElements();

    // Handle focus events
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      this.handleFocusChange(target);
    });

    // Update focusable elements when DOM changes
    const observer = new MutationObserver(() => {
      this.updateFocusableElements();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['tabindex', 'disabled', 'aria-hidden']
    });
  }

  /**
   * Setup keyboard navigation
   */
  private setupKeyboardNavigation(): void {
    // Register common keyboard shortcuts
    this.registerShortcut('Alt+1', () => this.focusElement('#main-content'), 'Focus main content');
    this.registerShortcut('Alt+2', () => this.focusElement('#audio-controls'), 'Focus audio controls');
    this.registerShortcut('Alt+3', () => this.focusElement('#timeline'), 'Focus timeline');
    this.registerShortcut('Alt+4', () => this.focusElement('#track-list'), 'Focus track list');

    // Audio-specific shortcuts
    this.registerShortcut('Space', () => this.handleSpaceKey(), 'Play/Pause audio');
    this.registerShortcut('ArrowLeft', () => this.handleArrowKey('left'), 'Seek backward');
    this.registerShortcut('ArrowRight', () => this.handleArrowKey('right'), 'Seek forward');
    this.registerShortcut('ArrowUp', () => this.handleArrowKey('up'), 'Volume up');
    this.registerShortcut('ArrowDown', () => this.handleArrowKey('down'), 'Volume down');

    // Global keyboard handler
    document.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });
  }

  /**
   * Create live regions for announcements
   */
  private createLiveRegions(): void {
    // Status region for general updates
    const statusRegion = document.createElement('div');
    statusRegion.setAttribute('aria-live', 'polite');
    statusRegion.setAttribute('aria-label', 'Status updates');
    statusRegion.setAttribute('role', 'status');
    statusRegion.className = 'sr-only';
    statusRegion.id = 'aria-status-region';
    document.body.appendChild(statusRegion);
    this.liveRegions.set('status', statusRegion);

    // Alert region for important notifications
    const alertRegion = document.createElement('div');
    alertRegion.setAttribute('aria-live', 'assertive');
    alertRegion.setAttribute('aria-label', 'Important alerts');
    alertRegion.setAttribute('role', 'alert');
    alertRegion.className = 'sr-only';
    alertRegion.id = 'aria-alert-region';
    document.body.appendChild(alertRegion);
    this.liveRegions.set('alert', alertRegion);

    // Log region for activity updates
    const logRegion = document.createElement('div');
    logRegion.setAttribute('aria-live', 'polite');
    logRegion.setAttribute('aria-label', 'Activity log');
    logRegion.setAttribute('role', 'log');
    logRegion.className = 'sr-only';
    logRegion.id = 'aria-log-region';
    document.body.appendChild(logRegion);
    this.liveRegions.set('log', logRegion);

    // Timer region for time-based updates
    const timerRegion = document.createElement('div');
    timerRegion.setAttribute('aria-live', 'off');
    timerRegion.setAttribute('aria-label', 'Playback time');
    timerRegion.setAttribute('role', 'timer');
    timerRegion.className = 'sr-only';
    timerRegion.id = 'aria-timer-region';
    document.body.appendChild(timerRegion);
    this.liveRegions.set('timer', timerRegion);
  }

  /**
   * Setup landmarks and semantic structure
   */
  private setupLandmarks(): void {
    // Ensure main content has proper landmark
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.setAttribute('role', 'main');
      mainContent.setAttribute('aria-label', 'Main content');
      mainContent.id = mainContent.id || 'main-content';
    }

    // Setup navigation landmarks
    const navElements = document.querySelectorAll('nav');
    navElements.forEach((nav, index) => {
      if (!nav.getAttribute('aria-label')) {
        nav.setAttribute('aria-label', `Navigation ${index + 1}`);
      }
    });

    // Setup complementary regions
    const asideElements = document.querySelectorAll('aside');
    asideElements.forEach((aside, index) => {
      aside.setAttribute('role', 'complementary');
      if (!aside.getAttribute('aria-label')) {
        aside.setAttribute('aria-label', `Sidebar ${index + 1}`);
      }
    });
  }

  /**
   * Setup audio-specific accessibility features
   */
  private setupAudioAccessibility(): void {
    // Audio control region
    const audioControls = document.querySelector('[data-audio-controls]');
    if (audioControls) {
      audioControls.setAttribute('role', 'group');
      audioControls.setAttribute('aria-label', 'Audio playback controls');
      audioControls.id = audioControls.id || 'audio-controls';
    }

    // Timeline region
    const timeline = document.querySelector('[data-timeline]');
    if (timeline) {
      timeline.setAttribute('role', 'slider');
      timeline.setAttribute('aria-label', 'Audio timeline');
      timeline.setAttribute('aria-orientation', 'horizontal');
      timeline.id = timeline.id || 'timeline';
    }

    // Track list
    const trackList = document.querySelector('[data-track-list]');
    if (trackList) {
      trackList.setAttribute('role', 'list');
      trackList.setAttribute('aria-label', 'Audio tracks');
      trackList.id = trackList.id || 'track-list';

      // Individual tracks
      const tracks = trackList.querySelectorAll('[data-track]');
      tracks.forEach((track, index) => {
        track.setAttribute('role', 'listitem');
        track.setAttribute('aria-label', `Track ${index + 1}`);
      });
    }
  }

  /**
   * Add element to accessibility system
   */
  addAriaElement(config: AriaLabel): void {
    const { element, role, label, description, ...attributes } = config;

    // Set role if provided
    if (role) {
      element.setAttribute('role', role);
    }

    // Set aria-label
    element.setAttribute('aria-label', label);

    // Set aria-description if provided
    if (description) {
      element.setAttribute('aria-description', description);
    }

    // Set all other ARIA attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined) {
        const ariaAttribute = this.camelToKebab(`aria${key.charAt(0).toUpperCase() + key.slice(1)}`);
        element.setAttribute(ariaAttribute, String(value));
      }
    });

    // Update focusable elements list
    this.updateFocusableElements();
  }

  /**
   * Update ARIA attributes for element
   */
  updateAriaElement(element: HTMLElement, updates: Partial<AriaLabel>): void {
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'element') return;

      if (key === 'role') {
        element.setAttribute('role', value as string);
      } else if (key === 'label') {
        element.setAttribute('aria-label', value as string);
      } else if (key === 'description') {
        element.setAttribute('aria-description', value as string);
      } else if (value !== undefined) {
        const ariaAttribute = this.camelToKebab(`aria${key.charAt(0).toUpperCase() + key.slice(1)}`);
        element.setAttribute(ariaAttribute, String(value));
      }
    });
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'low' | 'medium' | 'high' = 'medium'): void {
    const announcement: AriaAnnouncement = {
      id: `announcement_${Date.now()}`,
      message,
      priority,
      timestamp: Date.now(),
      type: priority === 'high' ? 'alert' : 'status'
    };

    this.state.announcements.push(announcement);

    // Select appropriate live region
    const regionType = priority === 'high' ? 'alert' : 'status';
    const region = this.liveRegions.get(regionType);

    if (region) {
      region.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        region.textContent = '';
      }, 1000);
    }

    console.log(`📢 ARIA Announcement [${priority}]: ${message}`);

    // Clean up old announcements
    this.cleanupAnnouncements();
  }

  /**
   * Announce audio status changes
   */
  announceAudioStatus(status: {
    action: string;
    currentTime?: string;
    duration?: string;
    trackName?: string;
    volume?: number;
  }): void {
    let message = '';

    switch (status.action) {
      case 'play':
        message = `Playing${status.trackName ? ` ${status.trackName}` : ''}${status.currentTime ? ` at ${status.currentTime}` : ''}`;
        break;
      case 'pause':
        message = `Paused${status.currentTime ? ` at ${status.currentTime}` : ''}`;
        break;
      case 'stop':
        message = 'Playback stopped';
        break;
      case 'seek':
        message = `Seeked to ${status.currentTime}`;
        break;
      case 'volume':
        message = `Volume set to ${status.volume}%`;
        break;
      case 'track_select':
        message = `Selected track: ${status.trackName}`;
        break;
      case 'track_mute':
        message = `Muted track: ${status.trackName}`;
        break;
      case 'track_unmute':
        message = `Unmuted track: ${status.trackName}`;
        break;
      case 'process_complete':
        message = `Audio processing complete${status.trackName ? ` for ${status.trackName}` : ''}`;
        break;
      case 'export_complete':
        message = `Export complete${status.trackName ? ` for ${status.trackName}` : ''}`;
        break;
      default:
        message = status.action;
    }

    this.announce(message, 'medium');
  }

  /**
   * Create accessible form controls
   */
  createAccessibleSlider(config: {
    container: HTMLElement;
    label: string;
    min: number;
    max: number;
    value: number;
    step?: number;
    orientation?: 'horizontal' | 'vertical';
    onChange: (value: number) => void;
  }): HTMLElement {
    const { container, label, min, max, value, step = 1, orientation = 'horizontal', onChange } = config;

    const sliderGroup = document.createElement('div');
    sliderGroup.className = 'accessible-slider-group';
    sliderGroup.setAttribute('role', 'group');
    sliderGroup.setAttribute('aria-label', label);

    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.className = 'slider-label';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(value);
    slider.step = String(step);
    slider.className = 'accessible-slider';

    // ARIA attributes
    slider.setAttribute('aria-label', label);
    slider.setAttribute('aria-orientation', orientation);
    slider.setAttribute('aria-valuemin', String(min));
    slider.setAttribute('aria-valuemax', String(max));
    slider.setAttribute('aria-valuenow', String(value));

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = String(value);
    valueDisplay.className = 'slider-value';
    valueDisplay.setAttribute('aria-live', 'polite');

    // Handle changes
    slider.addEventListener('input', (e) => {
      const newValue = Number((e.target as HTMLInputElement).value);
      slider.setAttribute('aria-valuenow', String(newValue));
      valueDisplay.textContent = String(newValue);
      onChange(newValue);
    });

    // Keyboard handling for fine control
    slider.addEventListener('keydown', (e) => {
      let delta = 0;
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          delta = -step;
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          delta = step;
          break;
        case 'Home':
          slider.value = String(min);
          onChange(min);
          e.preventDefault();
          break;
        case 'End':
          slider.value = String(max);
          onChange(max);
          e.preventDefault();
          break;
        case 'PageDown':
          delta = -step * 10;
          break;
        case 'PageUp':
          delta = step * 10;
          break;
      }

      if (delta !== 0) {
        const currentValue = Number(slider.value);
        const newValue = Math.max(min, Math.min(max, currentValue + delta));
        slider.value = String(newValue);
        onChange(newValue);
        e.preventDefault();
      }
    });

    sliderGroup.appendChild(labelElement);
    sliderGroup.appendChild(slider);
    sliderGroup.appendChild(valueDisplay);
    container.appendChild(sliderGroup);

    return sliderGroup;
  }

  /**
   * Create accessible button with proper ARIA
   */
  createAccessibleButton(config: {
    container: HTMLElement;
    label: string;
    description?: string;
    icon?: string;
    pressed?: boolean;
    disabled?: boolean;
    onClick: () => void;
  }): HTMLButtonElement {
    const { container, label, description, icon, pressed, disabled, onClick } = config;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'accessible-button';
    button.setAttribute('aria-label', label);

    if (description) {
      button.setAttribute('aria-description', description);
    }

    if (pressed !== undefined) {
      button.setAttribute('aria-pressed', String(pressed));
    }

    if (disabled) {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
    }

    if (icon) {
      const iconElement = document.createElement('span');
      iconElement.innerHTML = icon;
      iconElement.setAttribute('aria-hidden', 'true');
      button.appendChild(iconElement);
    }

    const textElement = document.createElement('span');
    textElement.textContent = label;
    if (icon) {
      textElement.className = 'sr-only'; // Hide text if icon is present
    }
    button.appendChild(textElement);

    button.addEventListener('click', onClick);

    container.appendChild(button);
    return button;
  }

  /**
   * Focus management
   */
  focusElement(selector: string): boolean {
    const element = document.querySelector(selector) as HTMLElement;
    if (element && element.tabIndex >= 0) {
      element.focus();
      this.announce(`Focused ${element.getAttribute('aria-label') || element.tagName.toLowerCase()}`);
      return true;
    }
    return false;
  }

  /**
   * Set focus trap for modal dialogs
   */
  setFocusTrap(container: HTMLElement): void {
    this.state.focusTraps.push(container);

    // Store currently focused element
    const previousFocus = document.activeElement as HTMLElement;

    // Find focusable elements within container
    const focusableElements = this.getFocusableElements(container);

    if (focusableElements.length === 0) return;

    // Focus first element
    focusableElements[0].focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
          }
        }
      }

      if (e.key === 'Escape') {
        this.removeFocusTrap(container);
        if (previousFocus) {
          previousFocus.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    container.dataset.focusTrapHandler = 'true';
  }

  /**
   * Remove focus trap
   */
  removeFocusTrap(container: HTMLElement): void {
    const index = this.state.focusTraps.indexOf(container);
    if (index > -1) {
      this.state.focusTraps.splice(index, 1);
    }

    delete container.dataset.focusTrapHandler;
  }

  /**
   * Register keyboard shortcut
   */
  registerShortcut(key: string, callback: () => void, description: string): void {
    this.keyboardShortcuts.set(key, { callback, description });
  }

  /**
   * Get all registered shortcuts
   */
  getKeyboardShortcuts(): Array<{ key: string; description: string }> {
    return Array.from(this.keyboardShortcuts.entries()).map(([key, { description }]) => ({
      key,
      description
    }));
  }

  // Private helper methods

  private updateFocusableElements(): void {
    const focusable = document.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    ) as NodeListOf<HTMLElement>;

    this.state.focusableElements = Array.from(focusable).map(element => ({
      element,
      tabIndex: element.tabIndex,
      originalTabIndex: element.dataset.originalTabIndex ?
        parseInt(element.dataset.originalTabIndex) : undefined
    }));
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    )) as HTMLElement[];
  }

  private handleFocusChange(element: HTMLElement): void {
    this.state.currentFocus = element;
    this.focusHistory.push(element);

    // Keep only last 10 focus events
    if (this.focusHistory.length > 10) {
      this.focusHistory.shift();
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    const key = this.getKeyString(event);
    const shortcut = this.keyboardShortcuts.get(key);

    if (shortcut) {
      shortcut.callback();
      event.preventDefault();
    }
  }

  private getKeyString(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    parts.push(event.key);
    return parts.join('+');
  }

  private handleSpaceKey(): void {
    // Implemented by consuming application
    this.announce('Space key pressed');
  }

  private handleArrowKey(direction: 'left' | 'right' | 'up' | 'down'): void {
    // Implemented by consuming application
    this.announce(`Arrow ${direction} pressed`);
  }

  private cleanupAnnouncements(): void {
    const cutoff = Date.now() - 30000; // Keep last 30 seconds
    this.state.announcements = this.state.announcements.filter(
      announcement => announcement.timestamp > cutoff
    );
  }

  private camelToKebab(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  private addSkipLinkStyles(): void {
    const styles = document.createElement('style');
    styles.textContent = `
      .skip-links {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: white;
        padding: 8px;
        border-radius: 4px;
        z-index: 1000;
        font-size: 14px;
      }

      .skip-links:focus-within {
        top: 6px;
      }

      .skip-link {
        color: white;
        text-decoration: none;
        display: block;
        padding: 4px 8px;
      }

      .skip-link:focus,
      .skip-link:hover {
        background: #333;
        outline: 2px solid white;
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .accessible-slider-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin: 8px 0;
      }

      .slider-label {
        font-weight: 500;
        font-size: 14px;
      }

      .accessible-slider {
        width: 100%;
        height: 6px;
        background: #ddd;
        outline: none;
        border-radius: 3px;
      }

      .accessible-slider:focus {
        outline: 2px solid #007cba;
        outline-offset: 2px;
      }

      .slider-value {
        font-size: 12px;
        color: #666;
        text-align: right;
      }

      .accessible-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border: 1px solid #ccc;
        background: #f9f9f9;
        border-radius: 4px;
        cursor: pointer;
      }

      .accessible-button:focus {
        outline: 2px solid #007cba;
        outline-offset: 2px;
      }

      .accessible-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      @media (prefers-contrast: high) {
        .accessible-button {
          border: 2px solid #000;
          background: #fff;
        }

        .accessible-slider {
          background: #000;
        }
      }

      .reduce-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }

      .high-contrast .accessible-button {
        border: 2px solid #000 !important;
        background: #fff !important;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Get current accessibility state
   */
  getAccessibilityState(): AriaAccessibilityState {
    return { ...this.state };
  }

  /**
   * Export accessibility report
   */
  generateAccessibilityReport(): {
    elements: number;
    announcements: number;
    shortcuts: number;
    preferences: {
      screenReader: boolean;
      highContrast: boolean;
      reducedMotion: boolean;
    };
    compliance: {
      skipLinks: boolean;
      landmarks: boolean;
      liveRegions: boolean;
      keyboardNavigation: boolean;
    };
  } {
    return {
      elements: this.state.focusableElements.length,
      announcements: this.state.announcements.length,
      shortcuts: this.keyboardShortcuts.size,
      preferences: {
        screenReader: this.state.screenReaderMode,
        highContrast: this.state.highContrastMode,
        reducedMotion: this.state.reducedMotion
      },
      compliance: {
        skipLinks: document.querySelector('.skip-links') !== null,
        landmarks: document.querySelector('[role="main"]') !== null,
        liveRegions: this.liveRegions.size > 0,
        keyboardNavigation: this.keyboardShortcuts.size > 0
      }
    };
  }
}