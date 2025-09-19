import { EventEmitter } from 'events';

// Core visualization interfaces
export interface VisualizationConfig {
  width: number;
  height: number;
  canvasId?: string;
  updateRate: number; // FPS
  backgroundColor: string;
  gridColor: string;
  waveformColor: string;
  spectrumColor: string;
  enableAntialiasing: boolean;
  enableGrid: boolean;
  responsive: boolean;
}

export interface WaveformConfig extends VisualizationConfig {
  channels: number;
  timeRange: number; // seconds
  amplitude: number;
  lineWidth: number;
  fillWaveform: boolean;
  showCenterLine: boolean;
  channelSeparation: number;
  scrolling: boolean;
  showRuler: boolean;
  rulerStyle: RulerStyle;
}

export interface SpectrumConfig extends VisualizationConfig {
  fftSize: 256 | 512 | 1024 | 2048 | 4096 | 8192;
  minFrequency: number;
  maxFrequency: number;
  minDecibels: number;
  maxDecibels: number;
  smoothingTimeConstant: number;
  barCount: number;
  barSpacing: number;
  logarithmicScale: boolean;
  showFrequencyLabels: boolean;
  showDecibelLabels: boolean;
  peakHold: boolean;
  peakDecay: number;
}

export interface SpectrogramConfig extends VisualizationConfig {
  fftSize: 1024 | 2048 | 4096;
  hopSize: number;
  timeRange: number; // seconds
  frequencyRange: [number, number];
  dynamicRange: number; // dB
  colormap: 'jet' | 'plasma' | 'viridis' | 'hot' | 'cool';
  showColorbar: boolean;
  scrollDirection: 'horizontal' | 'vertical';
}

export interface VectorScopeConfig extends VisualizationConfig {
  sensitivity: number;
  fadeRate: number;
  dotSize: number;
  showGrid: boolean;
  showPhaseCorrelation: boolean;
  colorMode: 'mono' | 'frequency' | 'amplitude';
}

export interface PhaseMeterConfig extends VisualizationConfig {
  correlationRange: [-1, 1];
  averagingTime: number;
  showNumericValue: boolean;
  warningThreshold: number;
  criticalThreshold: number;
}

export interface RulerStyle {
  majorTickColor: string;
  minorTickColor: string;
  labelColor: string;
  fontSize: number;
  fontFamily: string;
  majorTickInterval: number;
  minorTickInterval: number;
  showLabels: boolean;
}

// Visualization data structures
export interface WaveformData {
  samples: Float32Array[];
  sampleRate: number;
  duration: number;
  peaks: Float32Array[];
  rms: Float32Array[];
}

export interface SpectrumData {
  frequencies: Float32Array;
  magnitudes: Float32Array;
  phases: Float32Array;
  peaks: Float32Array;
  sampleRate: number;
  fftSize: number;
}

export interface SpectrogramData {
  timeFrames: Float32Array[];
  frequencies: Float32Array;
  magnitudes: Float32Array[];
  timeStep: number;
  frequencyStep: number;
}

export interface StereoData {
  left: Float32Array;
  right: Float32Array;
  correlation: number;
  width: number;
  balance: number;
}

// Animation and interaction
export interface AnimationState {
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  looping: boolean;
  startTime: number;
  endTime: number;
}

export interface InteractionState {
  isSelecting: boolean;
  selectionStart: number;
  selectionEnd: number;
  isDragging: boolean;
  dragStart: { x: number; y: number };
  zoomLevel: number;
  panOffset: { x: number; y: number };
  cursor: CursorInfo;
}

export interface CursorInfo {
  position: { x: number; y: number };
  time: number;
  frequency: number;
  amplitude: number;
  visible: boolean;
}

// Color mapping and themes
export interface ColorMap {
  name: string;
  colors: string[];
  interpolate: (value: number) => string;
}

export interface VisualizationTheme {
  name: string;
  backgroundColor: string;
  gridColor: string;
  textColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  waveformColors: string[];
  spectrumColors: string[];
}

// Base visualizer class
export abstract class BaseVisualizer extends EventEmitter {
  protected canvas: HTMLCanvasElement;
  protected context: CanvasRenderingContext2D;
  protected config: VisualizationConfig;
  protected animationId: number | null = null;
  protected isRunning: boolean = false;
  protected lastFrameTime: number = 0;
  protected frameCount: number = 0;

  constructor(canvas: HTMLCanvasElement, config: VisualizationConfig) {
    super();
    this.canvas = canvas;
    this.config = { ...config };

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.context = ctx;

    this.setupCanvas();
    this.setupEventListeners();
  }

  protected setupCanvas(): void {
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;

    if (this.config.enableAntialiasing) {
      this.context.imageSmoothingEnabled = true;
      this.context.imageSmoothingQuality = 'high';
    }

    if (this.config.responsive) {
      this.setupResponsiveCanvas();
    }
  }

  protected setupResponsiveCanvas(): void {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.resize(width, height);
      }
    });

    resizeObserver.observe(this.canvas.parentElement || this.canvas);
  }

  protected setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  protected handleMouseDown(event: MouseEvent): void {
    this.emit('mouseDown', this.getMousePosition(event));
  }

  protected handleMouseMove(event: MouseEvent): void {
    this.emit('mouseMove', this.getMousePosition(event));
  }

  protected handleMouseUp(event: MouseEvent): void {
    this.emit('mouseUp', this.getMousePosition(event));
  }

  protected handleWheel(event: WheelEvent): void {
    event.preventDefault();
    this.emit('wheel', {
      delta: event.deltaY,
      position: this.getMousePosition(event)
    });
  }

  protected getMousePosition(event: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animate();
    this.emit('started');
  }

  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.emit('stopped');
  }

  public resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.emit('resized', { width, height });
  }

  public setConfig(config: Partial<VisualizationConfig>): void {
    Object.assign(this.config, config);
    this.emit('configChanged', this.config);
  }

  protected animate(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    const targetFrameTime = 1000 / this.config.updateRate;

    if (deltaTime >= targetFrameTime) {
      this.render(deltaTime);
      this.lastFrameTime = currentTime;
      this.frameCount++;
    }

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  protected abstract render(deltaTime: number): void;

  protected clearCanvas(): void {
    this.context.fillStyle = this.config.backgroundColor;
    this.context.fillRect(0, 0, this.config.width, this.config.height);
  }

  protected drawGrid(): void {
    if (!this.config.enableGrid) return;

    this.context.strokeStyle = this.config.gridColor;
    this.context.lineWidth = 1;
    this.context.setLineDash([2, 2]);

    const gridSpacing = 50;

    // Vertical lines
    for (let x = 0; x < this.config.width; x += gridSpacing) {
      this.context.beginPath();
      this.context.moveTo(x, 0);
      this.context.lineTo(x, this.config.height);
      this.context.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < this.config.height; y += gridSpacing) {
      this.context.beginPath();
      this.context.moveTo(0, y);
      this.context.lineTo(this.config.width, y);
      this.context.stroke();
    }

    this.context.setLineDash([]);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getFrameRate(): number {
    return this.frameCount / (performance.now() - this.lastFrameTime) * 1000;
  }

  public destroy(): void {
    this.stop();
    this.removeAllListeners();
  }
}

// Waveform visualizer
export class WaveformVisualizer extends BaseVisualizer {
  private waveformConfig: WaveformConfig;
  private audioData: Float32Array[] = [];
  private displayData: Float32Array[] = [];
  private scrollOffset: number = 0;
  private selectionRange: [number, number] | null = null;

  constructor(canvas: HTMLCanvasElement, config: WaveformConfig) {
    super(canvas, config);
    this.waveformConfig = config;
  }

  public setAudioData(audioData: Float32Array[]): void {
    this.audioData = audioData;
    this.processAudioData();
    this.emit('dataChanged', audioData);
  }

  private processAudioData(): void {
    const samplesPerPixel = this.calculateSamplesPerPixel();
    this.displayData = this.audioData.map(channel => this.downsample(channel, samplesPerPixel));
  }

  private calculateSamplesPerPixel(): number {
    if (this.audioData.length === 0) return 1;
    return Math.max(1, Math.floor(this.audioData[0]!.length / this.config.width));
  }

  private downsample(channel: Float32Array, samplesPerPixel: number): Float32Array {
    const outputLength = Math.ceil(channel.length / samplesPerPixel);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const start = i * samplesPerPixel;
      const end = Math.min(start + samplesPerPixel, channel.length);

      let max = 0;
      for (let j = start; j < end; j++) {
        max = Math.max(max, Math.abs(channel[j]!));
      }
      output[i] = max;
    }

    return output;
  }

  protected render(deltaTime: number): void {
    this.clearCanvas();

    if (this.config.enableGrid) {
      this.drawGrid();
    }

    this.drawWaveform();

    if (this.waveformConfig.showCenterLine) {
      this.drawCenterLine();
    }

    if (this.waveformConfig.showRuler) {
      this.drawRuler();
    }

    if (this.selectionRange) {
      this.drawSelection();
    }
  }

  private drawWaveform(): void {
    if (this.displayData.length === 0) return;

    const channelHeight = this.config.height / this.waveformConfig.channels;
    const centerY = channelHeight / 2;

    this.context.lineWidth = this.waveformConfig.lineWidth;

    for (let ch = 0; ch < this.displayData.length; ch++) {
      const channel = this.displayData[ch]!;
      const yOffset = ch * channelHeight;

      this.context.strokeStyle = this.getChannelColor(ch);
      this.context.beginPath();

      if (this.waveformConfig.fillWaveform) {
        this.drawFilledWaveform(channel, yOffset + centerY, centerY);
      } else {
        this.drawLineWaveform(channel, yOffset + centerY, centerY);
      }

      this.context.stroke();
    }
  }

  private drawLineWaveform(channel: Float32Array, centerY: number, amplitude: number): void {
    for (let i = 0; i < Math.min(channel.length, this.config.width); i++) {
      const x = i;
      const y = centerY - (channel[i]! * amplitude * this.waveformConfig.amplitude);

      if (i === 0) {
        this.context.moveTo(x, y);
      } else {
        this.context.lineTo(x, y);
      }
    }
  }

  private drawFilledWaveform(channel: Float32Array, centerY: number, amplitude: number): void {
    this.context.fillStyle = this.context.strokeStyle;

    for (let i = 0; i < Math.min(channel.length, this.config.width); i++) {
      const x = i;
      const height = channel[i]! * amplitude * this.waveformConfig.amplitude;

      this.context.fillRect(x, centerY - height, 1, height * 2);
    }
  }

  private drawCenterLine(): void {
    this.context.strokeStyle = this.config.gridColor;
    this.context.lineWidth = 1;
    this.context.setLineDash([5, 5]);

    const channelHeight = this.config.height / this.waveformConfig.channels;

    for (let ch = 0; ch < this.waveformConfig.channels; ch++) {
      const y = (ch + 0.5) * channelHeight;
      this.context.beginPath();
      this.context.moveTo(0, y);
      this.context.lineTo(this.config.width, y);
      this.context.stroke();
    }

    this.context.setLineDash([]);
  }

  private drawRuler(): void {
    const rulerHeight = 30;
    const rulerY = this.config.height - rulerHeight;

    // Draw ruler background
    this.context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.context.fillRect(0, rulerY, this.config.width, rulerHeight);

    // Draw time markers
    this.context.strokeStyle = this.waveformConfig.rulerStyle.majorTickColor;
    this.context.fillStyle = this.waveformConfig.rulerStyle.labelColor;
    this.context.font = `${this.waveformConfig.rulerStyle.fontSize}px ${this.waveformConfig.rulerStyle.fontFamily}`;

    const timeStep = this.waveformConfig.timeRange / this.config.width;
    const majorInterval = this.waveformConfig.rulerStyle.majorTickInterval;

    for (let x = 0; x < this.config.width; x += 50) {
      const time = x * timeStep;
      const isSecondMarker = time % majorInterval < timeStep;

      this.context.beginPath();
      this.context.moveTo(x, rulerY);
      this.context.lineTo(x, rulerY + (isSecondMarker ? 15 : 10));
      this.context.stroke();

      if (isSecondMarker && this.waveformConfig.rulerStyle.showLabels) {
        const label = this.formatTime(time);
        this.context.fillText(label, x + 2, rulerY + 25);
      }
    }
  }

  private drawSelection(): void {
    if (!this.selectionRange) return;

    const [start, end] = this.selectionRange;
    const startX = start * this.config.width;
    const endX = end * this.config.width;

    this.context.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.context.fillRect(startX, 0, endX - startX, this.config.height);

    this.context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.context.lineWidth = 2;
    this.context.beginPath();
    this.context.moveTo(startX, 0);
    this.context.lineTo(startX, this.config.height);
    this.context.moveTo(endX, 0);
    this.context.lineTo(endX, this.config.height);
    this.context.stroke();
  }

  private getChannelColor(channel: number): string {
    const colors = [this.config.waveformColor, '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
    return colors[channel % colors.length]!;
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  }

  public setSelection(start: number, end: number): void {
    this.selectionRange = [Math.min(start, end), Math.max(start, end)];
    this.emit('selectionChanged', this.selectionRange);
  }

  public clearSelection(): void {
    this.selectionRange = null;
    this.emit('selectionCleared');
  }

  public zoom(factor: number, center?: number): void {
    this.emit('zoomed', { factor, center });
  }

  public scroll(offset: number): void {
    this.scrollOffset = offset;
    this.emit('scrolled', offset);
  }
}

// Spectrum analyzer visualizer
export class SpectrumVisualizer extends BaseVisualizer {
  private spectrumConfig: SpectrumConfig;
  private analyser: AnalyserNode | null = null;
  private frequencyData: Float32Array = new Float32Array(0);
  private peakData: Float32Array = new Float32Array(0);
  private smoothedData: Float32Array = new Float32Array(0);

  constructor(canvas: HTMLCanvasElement, config: SpectrumConfig, audioContext?: AudioContext) {
    super(canvas, config);
    this.spectrumConfig = config;

    if (audioContext) {
      this.setupAnalyser(audioContext);
    }
  }

  private setupAnalyser(audioContext: AudioContext): void {
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = this.spectrumConfig.fftSize;
    this.analyser.minDecibels = this.spectrumConfig.minDecibels;
    this.analyser.maxDecibels = this.spectrumConfig.maxDecibels;
    this.analyser.smoothingTimeConstant = this.spectrumConfig.smoothingTimeConstant;

    const bufferLength = this.analyser.frequencyBinCount;
    this.frequencyData = new Float32Array(bufferLength);
    this.peakData = new Float32Array(bufferLength);
    this.smoothedData = new Float32Array(bufferLength);
  }

  public connectInput(source: AudioNode): void {
    if (this.analyser) {
      source.connect(this.analyser);
    }
  }

  public disconnectInput(): void {
    if (this.analyser) {
      this.analyser.disconnect();
    }
  }

  protected render(deltaTime: number): void {
    this.clearCanvas();

    if (this.config.enableGrid) {
      this.drawGrid();
    }

    this.updateFrequencyData();
    this.drawSpectrum();

    if (this.spectrumConfig.showFrequencyLabels) {
      this.drawFrequencyLabels();
    }

    if (this.spectrumConfig.showDecibelLabels) {
      this.drawDecibelLabels();
    }

    if (this.spectrumConfig.peakHold) {
      this.drawPeaks();
    }
  }

  private updateFrequencyData(): void {
    if (!this.analyser) return;

    this.analyser.getFloatFrequencyData(this.frequencyData);

    // Apply smoothing
    for (let i = 0; i < this.frequencyData.length; i++) {
      this.smoothedData[i] = this.smoothedData[i] * 0.8 + this.frequencyData[i]! * 0.2;
    }

    // Update peaks
    if (this.spectrumConfig.peakHold) {
      for (let i = 0; i < this.frequencyData.length; i++) {
        if (this.frequencyData[i]! > this.peakData[i]!) {
          this.peakData[i] = this.frequencyData[i]!;
        } else {
          this.peakData[i] *= this.spectrumConfig.peakDecay;
        }
      }
    }
  }

  private drawSpectrum(): void {
    if (this.frequencyData.length === 0) return;

    const barWidth = this.config.width / this.spectrumConfig.barCount;
    const barSpacing = this.spectrumConfig.barSpacing;
    const effectiveBarWidth = barWidth - barSpacing;

    this.context.fillStyle = this.config.spectrumColor;

    for (let i = 0; i < this.spectrumConfig.barCount; i++) {
      const dataIndex = this.getDataIndex(i);
      const value = this.smoothedData[dataIndex] || this.spectrumConfig.minDecibels;
      const normalizedValue = this.normalizeValue(value);

      const x = i * barWidth + barSpacing / 2;
      const height = normalizedValue * this.config.height;
      const y = this.config.height - height;

      // Draw bar with gradient
      const gradient = this.context.createLinearGradient(0, y, 0, this.config.height);
      gradient.addColorStop(0, this.getFrequencyColor(normalizedValue));
      gradient.addColorStop(1, this.darkenColor(this.getFrequencyColor(normalizedValue)));

      this.context.fillStyle = gradient;
      this.context.fillRect(x, y, effectiveBarWidth, height);
    }
  }

  private drawPeaks(): void {
    if (!this.spectrumConfig.peakHold || this.peakData.length === 0) return;

    const barWidth = this.config.width / this.spectrumConfig.barCount;
    const barSpacing = this.spectrumConfig.barSpacing;
    const effectiveBarWidth = barWidth - barSpacing;

    this.context.strokeStyle = '#ffffff';
    this.context.lineWidth = 2;

    for (let i = 0; i < this.spectrumConfig.barCount; i++) {
      const dataIndex = this.getDataIndex(i);
      const value = this.peakData[dataIndex] || this.spectrumConfig.minDecibels;
      const normalizedValue = this.normalizeValue(value);

      const x = i * barWidth + barSpacing / 2;
      const y = this.config.height - (normalizedValue * this.config.height);

      this.context.beginPath();
      this.context.moveTo(x, y);
      this.context.lineTo(x + effectiveBarWidth, y);
      this.context.stroke();
    }
  }

  private drawFrequencyLabels(): void {
    this.context.fillStyle = '#ffffff';
    this.context.font = '12px Arial';
    this.context.textAlign = 'center';

    const frequencies = [100, 1000, 10000];

    for (const freq of frequencies) {
      const x = this.frequencyToX(freq);
      this.context.fillText(`${freq}Hz`, x, this.config.height - 5);
    }
  }

  private drawDecibelLabels(): void {
    this.context.fillStyle = '#ffffff';
    this.context.font = '12px Arial';
    this.context.textAlign = 'right';

    const decibels = [-60, -40, -20, 0];

    for (const db of decibels) {
      const y = this.decibelToY(db);
      this.context.fillText(`${db}dB`, this.config.width - 5, y);
    }
  }

  private getDataIndex(barIndex: number): number {
    if (this.spectrumConfig.logarithmicScale) {
      const minLog = Math.log10(this.spectrumConfig.minFrequency);
      const maxLog = Math.log10(this.spectrumConfig.maxFrequency);
      const logRange = maxLog - minLog;
      const logValue = minLog + (barIndex / this.spectrumConfig.barCount) * logRange;
      const frequency = Math.pow(10, logValue);
      return Math.floor((frequency / (this.analyser?.context.sampleRate || 44100)) * this.frequencyData.length * 2);
    } else {
      return Math.floor((barIndex / this.spectrumConfig.barCount) * this.frequencyData.length);
    }
  }

  private normalizeValue(value: number): number {
    return Math.max(0, Math.min(1,
      (value - this.spectrumConfig.minDecibels) /
      (this.spectrumConfig.maxDecibels - this.spectrumConfig.minDecibels)
    ));
  }

  private frequencyToX(frequency: number): number {
    if (this.spectrumConfig.logarithmicScale) {
      const minLog = Math.log10(this.spectrumConfig.minFrequency);
      const maxLog = Math.log10(this.spectrumConfig.maxFrequency);
      const logValue = Math.log10(frequency);
      return ((logValue - minLog) / (maxLog - minLog)) * this.config.width;
    } else {
      return ((frequency - this.spectrumConfig.minFrequency) /
             (this.spectrumConfig.maxFrequency - this.spectrumConfig.minFrequency)) * this.config.width;
    }
  }

  private decibelToY(decibel: number): number {
    const normalized = (decibel - this.spectrumConfig.minDecibels) /
                      (this.spectrumConfig.maxDecibels - this.spectrumConfig.minDecibels);
    return this.config.height - (normalized * this.config.height);
  }

  private getFrequencyColor(normalizedValue: number): string {
    // HSL color mapping from blue (low) to red (high)
    const hue = (1 - normalizedValue) * 240; // 240 = blue, 0 = red
    const saturation = 100;
    const lightness = 50 + normalizedValue * 30;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  private darkenColor(color: string): string {
    // Simple color darkening for gradient effect
    if (color.startsWith('hsl')) {
      return color.replace(/(\d+)%\)$/, (match, lightness) => {
        const newLightness = Math.max(0, parseInt(lightness) - 20);
        return `${newLightness}%)`;
      });
    }
    return color;
  }
}

// Vectorscope visualizer
export class VectorScopeVisualizer extends BaseVisualizer {
  private vectorConfig: VectorScopeConfig;
  private points: Array<{ x: number; y: number; age: number }> = [];
  private correlation: number = 0;

  constructor(canvas: HTMLCanvasElement, config: VectorScopeConfig) {
    super(canvas, config);
    this.vectorConfig = config;
  }

  public addStereoSample(left: number, right: number): void {
    const centerX = this.config.width / 2;
    const centerY = this.config.height / 2;
    const scale = Math.min(centerX, centerY) * this.vectorConfig.sensitivity;

    // Convert L/R to X/Y coordinates
    const x = centerX + ((left + right) / 2) * scale;
    const y = centerY - ((left - right) / 2) * scale;

    this.points.push({ x, y, age: 0 });

    // Limit number of points for performance
    if (this.points.length > 1000) {
      this.points.shift();
    }

    // Update correlation
    this.correlation = this.correlation * 0.99 + (left * right) * 0.01;
  }

  protected render(deltaTime: number): void {
    this.clearCanvas();

    if (this.vectorConfig.showGrid) {
      this.drawVectorGrid();
    }

    this.drawPoints();

    if (this.vectorConfig.showPhaseCorrelation) {
      this.drawCorrelationInfo();
    }

    this.agePoints(deltaTime);
  }

  private drawVectorGrid(): void {
    const centerX = this.config.width / 2;
    const centerY = this.config.height / 2;
    const radius = Math.min(centerX, centerY) * 0.9;

    this.context.strokeStyle = this.config.gridColor;
    this.context.lineWidth = 1;

    // Draw circles
    for (let r = radius / 4; r <= radius; r += radius / 4) {
      this.context.beginPath();
      this.context.arc(centerX, centerY, r, 0, Math.PI * 2);
      this.context.stroke();
    }

    // Draw axes
    this.context.beginPath();
    this.context.moveTo(0, centerY);
    this.context.lineTo(this.config.width, centerY);
    this.context.moveTo(centerX, 0);
    this.context.lineTo(centerX, this.config.height);
    this.context.stroke();

    // Draw diagonal lines
    this.context.setLineDash([5, 5]);
    this.context.beginPath();
    this.context.moveTo(0, 0);
    this.context.lineTo(this.config.width, this.config.height);
    this.context.moveTo(this.config.width, 0);
    this.context.lineTo(0, this.config.height);
    this.context.stroke();
    this.context.setLineDash([]);

    // Draw labels
    this.context.fillStyle = '#ffffff';
    this.context.font = '12px Arial';
    this.context.textAlign = 'center';
    this.context.fillText('L+R', centerX, 15);
    this.context.fillText('L-R', this.config.width - 15, centerY - 5);
  }

  private drawPoints(): void {
    for (const point of this.points) {
      const alpha = Math.max(0, 1 - point.age * this.vectorConfig.fadeRate);
      const size = this.vectorConfig.dotSize * alpha;

      this.context.fillStyle = this.getPointColor(point, alpha);
      this.context.beginPath();
      this.context.arc(point.x, point.y, size, 0, Math.PI * 2);
      this.context.fill();
    }
  }

  private drawCorrelationInfo(): void {
    const text = `Correlation: ${this.correlation.toFixed(3)}`;
    const phase = Math.abs(this.correlation) > 0.7 ? 'MONO' :
                  this.correlation < -0.7 ? 'OUT OF PHASE' : 'STEREO';

    this.context.fillStyle = '#ffffff';
    this.context.font = 'bold 14px Arial';
    this.context.textAlign = 'left';
    this.context.fillText(text, 10, 20);
    this.context.fillText(phase, 10, 40);

    // Draw correlation meter
    const meterWidth = 200;
    const meterHeight = 10;
    const meterX = 10;
    const meterY = 50;

    // Background
    this.context.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.context.fillRect(meterX, meterY, meterWidth, meterHeight);

    // Correlation bar
    const barWidth = Math.abs(this.correlation) * meterWidth;
    const barX = this.correlation >= 0 ? meterX + meterWidth / 2 : meterX + meterWidth / 2 - barWidth;

    this.context.fillStyle = this.correlation >= 0 ? '#00ff00' : '#ff0000';
    this.context.fillRect(barX, meterY, barWidth, meterHeight);

    // Center line
    this.context.strokeStyle = '#ffffff';
    this.context.lineWidth = 1;
    this.context.beginPath();
    this.context.moveTo(meterX + meterWidth / 2, meterY);
    this.context.lineTo(meterX + meterWidth / 2, meterY + meterHeight);
    this.context.stroke();
  }

  private getPointColor(point: { x: number; y: number; age: number }, alpha: number): string {
    switch (this.vectorConfig.colorMode) {
      case 'frequency':
        // Color based on position (frequency content)
        const hue = (point.x / this.config.width) * 360;
        return `hsla(${hue}, 100%, 50%, ${alpha})`;

      case 'amplitude':
        // Color based on distance from center (amplitude)
        const centerX = this.config.width / 2;
        const centerY = this.config.height / 2;
        const distance = Math.sqrt((point.x - centerX) ** 2 + (point.y - centerY) ** 2);
        const normalizedDistance = distance / (Math.min(centerX, centerY));
        const intensity = Math.min(1, normalizedDistance) * 255;
        return `rgba(${intensity}, ${255 - intensity}, 128, ${alpha})`;

      default: // mono
        return `rgba(255, 255, 255, ${alpha})`;
    }
  }

  private agePoints(deltaTime: number): void {
    const ageIncrement = deltaTime / 1000; // Convert to seconds

    for (let i = this.points.length - 1; i >= 0; i--) {
      const point = this.points[i]!;
      point.age += ageIncrement;

      // Remove very old points
      if (point.age > 1 / this.vectorConfig.fadeRate) {
        this.points.splice(i, 1);
      }
    }
  }

  public getCorrelation(): number {
    return this.correlation;
  }

  public clear(): void {
    this.points = [];
    this.correlation = 0;
  }
}

// Visualization themes
export const VisualizationThemes: { [key: string]: VisualizationTheme } = {
  dark: {
    name: 'Dark',
    backgroundColor: '#1a1a1a',
    gridColor: '#333333',
    textColor: '#ffffff',
    primaryColor: '#4a9eff',
    secondaryColor: '#ff6b6b',
    accentColor: '#4ecdc4',
    waveformColors: ['#4a9eff', '#ff6b6b', '#4ecdc4', '#45b7d1'],
    spectrumColors: ['#4a9eff', '#45b7d1', '#4ecdc4', '#96ceb4']
  },

  light: {
    name: 'Light',
    backgroundColor: '#ffffff',
    gridColor: '#cccccc',
    textColor: '#333333',
    primaryColor: '#2196f3',
    secondaryColor: '#f44336',
    accentColor: '#009688',
    waveformColors: ['#2196f3', '#f44336', '#009688', '#ff9800'],
    spectrumColors: ['#2196f3', '#3f51b5', '#009688', '#4caf50']
  },

  neon: {
    name: 'Neon',
    backgroundColor: '#000000',
    gridColor: '#001122',
    textColor: '#00ffff',
    primaryColor: '#00ff00',
    secondaryColor: '#ff00ff',
    accentColor: '#ffff00',
    waveformColors: ['#00ff00', '#ff00ff', '#ffff00', '#00ffff'],
    spectrumColors: ['#00ff00', '#ff00ff', '#ffff00', '#00ffff']
  }
};

// Main audio visualizer controller
export class AudioVisualizationController extends EventEmitter {
  private waveformVisualizer: WaveformVisualizer | null = null;
  private spectrumVisualizer: SpectrumVisualizer | null = null;
  private vectorScopeVisualizer: VectorScopeVisualizer | null = null;
  private currentTheme: VisualizationTheme = VisualizationThemes.dark;
  private audioContext: AudioContext | null = null;

  constructor() {
    super();
  }

  public createWaveformVisualizer(canvas: HTMLCanvasElement, config: WaveformConfig): WaveformVisualizer {
    this.waveformVisualizer = new WaveformVisualizer(canvas, this.applyTheme(config));
    this.setupVisualizerEvents(this.waveformVisualizer, 'waveform');
    return this.waveformVisualizer;
  }

  public createSpectrumVisualizer(canvas: HTMLCanvasElement, config: SpectrumConfig): SpectrumVisualizer {
    this.spectrumVisualizer = new SpectrumVisualizer(canvas, this.applyTheme(config), this.audioContext || undefined);
    this.setupVisualizerEvents(this.spectrumVisualizer, 'spectrum');
    return this.spectrumVisualizer;
  }

  public createVectorScopeVisualizer(canvas: HTMLCanvasElement, config: VectorScopeConfig): VectorScopeVisualizer {
    this.vectorScopeVisualizer = new VectorScopeVisualizer(canvas, this.applyTheme(config));
    this.setupVisualizerEvents(this.vectorScopeVisualizer, 'vectorscope');
    return this.vectorScopeVisualizer;
  }

  public setAudioContext(audioContext: AudioContext): void {
    this.audioContext = audioContext;
  }

  public setTheme(theme: VisualizationTheme): void {
    this.currentTheme = theme;
    this.emit('themeChanged', theme);
  }

  public getTheme(): VisualizationTheme {
    return this.currentTheme;
  }

  public startAll(): void {
    this.waveformVisualizer?.start();
    this.spectrumVisualizer?.start();
    this.vectorScopeVisualizer?.start();
  }

  public stopAll(): void {
    this.waveformVisualizer?.stop();
    this.spectrumVisualizer?.stop();
    this.vectorScopeVisualizer?.stop();
  }

  public destroyAll(): void {
    this.waveformVisualizer?.destroy();
    this.spectrumVisualizer?.destroy();
    this.vectorScopeVisualizer?.destroy();

    this.waveformVisualizer = null;
    this.spectrumVisualizer = null;
    this.vectorScopeVisualizer = null;
  }

  private applyTheme(config: any): any {
    return {
      ...config,
      backgroundColor: this.currentTheme.backgroundColor,
      gridColor: this.currentTheme.gridColor,
      waveformColor: this.currentTheme.waveformColors[0],
      spectrumColor: this.currentTheme.spectrumColors[0]
    };
  }

  private setupVisualizerEvents(visualizer: BaseVisualizer, type: string): void {
    visualizer.on('started', () => this.emit(`${type}Started`));
    visualizer.on('stopped', () => this.emit(`${type}Stopped`));
    visualizer.on('resized', (size) => this.emit(`${type}Resized`, size));
    visualizer.on('mouseDown', (pos) => this.emit(`${type}MouseDown`, pos));
    visualizer.on('mouseMove', (pos) => this.emit(`${type}MouseMove`, pos));
    visualizer.on('mouseUp', (pos) => this.emit(`${type}MouseUp`, pos));
  }
}

// Default configurations
export const DefaultConfigs = {
  waveform: {
    width: 800,
    height: 200,
    updateRate: 60,
    backgroundColor: '#1a1a1a',
    gridColor: '#333333',
    waveformColor: '#4a9eff',
    spectrumColor: '#4a9eff',
    enableAntialiasing: true,
    enableGrid: true,
    responsive: true,
    channels: 2,
    timeRange: 10,
    amplitude: 1,
    lineWidth: 2,
    fillWaveform: false,
    showCenterLine: true,
    channelSeparation: 1,
    scrolling: false,
    showRuler: true,
    rulerStyle: {
      majorTickColor: '#ffffff',
      minorTickColor: '#888888',
      labelColor: '#ffffff',
      fontSize: 10,
      fontFamily: 'Arial',
      majorTickInterval: 1,
      minorTickInterval: 0.1,
      showLabels: true
    }
  } as WaveformConfig,

  spectrum: {
    width: 800,
    height: 300,
    updateRate: 60,
    backgroundColor: '#1a1a1a',
    gridColor: '#333333',
    waveformColor: '#4a9eff',
    spectrumColor: '#4a9eff',
    enableAntialiasing: true,
    enableGrid: true,
    responsive: true,
    fftSize: 2048,
    minFrequency: 20,
    maxFrequency: 20000,
    minDecibels: -100,
    maxDecibels: 0,
    smoothingTimeConstant: 0.8,
    barCount: 128,
    barSpacing: 2,
    logarithmicScale: true,
    showFrequencyLabels: true,
    showDecibelLabels: true,
    peakHold: true,
    peakDecay: 0.95
  } as SpectrumConfig,

  vectorscope: {
    width: 300,
    height: 300,
    updateRate: 60,
    backgroundColor: '#1a1a1a',
    gridColor: '#333333',
    waveformColor: '#4a9eff',
    spectrumColor: '#4a9eff',
    enableAntialiasing: true,
    enableGrid: true,
    responsive: true,
    sensitivity: 1,
    fadeRate: 0.01,
    dotSize: 2,
    showGrid: true,
    showPhaseCorrelation: true,
    colorMode: 'mono'
  } as VectorScopeConfig
};