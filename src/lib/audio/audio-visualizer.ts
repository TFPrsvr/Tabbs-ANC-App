"use client";

export class AudioVisualizer {
  private canvas: HTMLCanvasElement;
  private canvasContext: CanvasRenderingContext2D;
  private analyser: AnalyserNode;
  private animationId: number | null = null;
  private isAnimating: boolean = false;

  constructor(canvas: HTMLCanvasElement, analyser: AnalyserNode) {
    this.canvas = canvas;
    this.canvasContext = canvas.getContext('2d')!;
    this.analyser = analyser;
    this.setupCanvas();
  }

  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.canvasContext.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  startVisualization(type: 'waveform' | 'frequency' | 'circular' = 'frequency'): void {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    
    switch (type) {
      case 'waveform':
        this.drawWaveform();
        break;
      case 'frequency':
        this.drawFrequencyBars();
        break;
      case 'circular':
        this.drawCircularVisualization();
        break;
    }
  }

  stopVisualization(): void {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clearCanvas();
  }

  private drawWaveform(): void {
    if (!this.isAnimating) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    this.analyser.getByteTimeDomainData(dataArray);
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    this.canvasContext.fillStyle = 'rgba(15, 15, 35, 0.1)';
    this.canvasContext.fillRect(0, 0, width, height);
    
    this.canvasContext.lineWidth = 2;
    this.canvasContext.strokeStyle = '#8B5CF6';
    this.canvasContext.beginPath();
    
    const sliceWidth = width / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;
      
      if (i === 0) {
        this.canvasContext.moveTo(x, y);
      } else {
        this.canvasContext.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    this.canvasContext.lineTo(width, height / 2);
    this.canvasContext.stroke();
    
    this.animationId = requestAnimationFrame(() => this.drawWaveform());
  }

  private drawFrequencyBars(): void {
    if (!this.isAnimating) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    this.analyser.getByteFrequencyData(dataArray);
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    this.canvasContext.fillStyle = 'rgba(15, 15, 35, 0.2)';
    this.canvasContext.fillRect(0, 0, width, height);
    
    const barWidth = (width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * height;
      
      const hue = (i / bufferLength) * 360;
      const lightness = 50 + (dataArray[i] / 255) * 30;
      
      this.canvasContext.fillStyle = `hsl(${hue}, 70%, ${lightness}%)`;
      this.canvasContext.fillRect(x, height - barHeight, barWidth, barHeight);
      
      x += barWidth + 1;
    }
    
    this.animationId = requestAnimationFrame(() => this.drawFrequencyBars());
  }

  private drawCircularVisualization(): void {
    if (!this.isAnimating) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    this.analyser.getByteFrequencyData(dataArray);
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3;
    
    this.canvasContext.fillStyle = 'rgba(15, 15, 35, 0.1)';
    this.canvasContext.fillRect(0, 0, width, height);
    
    const angleStep = (Math.PI * 2) / bufferLength;
    
    for (let i = 0; i < bufferLength; i++) {
      const amplitude = dataArray[i] / 255;
      const angle = i * angleStep;
      
      const innerRadius = radius;
      const outerRadius = radius + (amplitude * radius * 0.5);
      
      const startX = centerX + Math.cos(angle) * innerRadius;
      const startY = centerY + Math.sin(angle) * innerRadius;
      const endX = centerX + Math.cos(angle) * outerRadius;
      const endY = centerY + Math.sin(angle) * outerRadius;
      
      const hue = (i / bufferLength) * 360;
      const alpha = 0.3 + amplitude * 0.7;
      
      this.canvasContext.strokeStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
      this.canvasContext.lineWidth = 2;
      this.canvasContext.beginPath();
      this.canvasContext.moveTo(startX, startY);
      this.canvasContext.lineTo(endX, endY);
      this.canvasContext.stroke();
    }
    
    // Draw center circle
    this.canvasContext.beginPath();
    this.canvasContext.arc(centerX, centerY, radius * 0.8, 0, Math.PI * 2);
    this.canvasContext.strokeStyle = '#8B5CF6';
    this.canvasContext.lineWidth = 3;
    this.canvasContext.stroke();
    
    this.animationId = requestAnimationFrame(() => this.drawCircularVisualization());
  }

  private clearCanvas(): void {
    this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  resize(): void {
    this.setupCanvas();
  }

  dispose(): void {
    this.stopVisualization();
  }
}

export class MultiStreamVisualizer {
  private visualizers: Map<string, AudioVisualizer> = new Map();
  private containers: Map<string, HTMLCanvasElement> = new Map();

  addStream(streamId: string, canvas: HTMLCanvasElement, analyser: AnalyserNode): void {
    const visualizer = new AudioVisualizer(canvas, analyser);
    this.visualizers.set(streamId, visualizer);
    this.containers.set(streamId, canvas);
  }

  removeStream(streamId: string): void {
    const visualizer = this.visualizers.get(streamId);
    if (visualizer) {
      visualizer.dispose();
      this.visualizers.delete(streamId);
      this.containers.delete(streamId);
    }
  }

  startVisualization(
    streamId: string, 
    type: 'waveform' | 'frequency' | 'circular' = 'frequency'
  ): void {
    const visualizer = this.visualizers.get(streamId);
    if (visualizer) {
      visualizer.startVisualization(type);
    }
  }

  stopVisualization(streamId: string): void {
    const visualizer = this.visualizers.get(streamId);
    if (visualizer) {
      visualizer.stopVisualization();
    }
  }

  startAllVisualizations(type: 'waveform' | 'frequency' | 'circular' = 'frequency'): void {
    this.visualizers.forEach(visualizer => {
      visualizer.startVisualization(type);
    });
  }

  stopAllVisualizations(): void {
    this.visualizers.forEach(visualizer => {
      visualizer.stopVisualization();
    });
  }

  resizeAll(): void {
    this.visualizers.forEach(visualizer => {
      visualizer.resize();
    });
  }

  dispose(): void {
    this.visualizers.forEach(visualizer => {
      visualizer.dispose();
    });
    this.visualizers.clear();
    this.containers.clear();
  }
}