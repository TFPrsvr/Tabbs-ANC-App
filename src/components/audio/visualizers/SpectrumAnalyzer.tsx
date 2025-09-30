'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SpectrumAnalyzerProps {
  audioData?: Float32Array;
  width?: number;
  height?: number;
  className?: string;
  variant?: 'standard' | 'professional' | 'minimal' | 'bars' | 'line' | 'waterfall';
  minFreq?: number;
  maxFreq?: number;
  minDb?: number;
  maxDb?: number;
  fftSize?: number;
  smoothing?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  showPeakHold?: boolean;
  realTime?: boolean;
  logarithmic?: boolean;
  colorScheme?: 'blue' | 'green' | 'rainbow' | 'fire' | 'ice' | 'custom';
  customColors?: string[];
  peakHoldTime?: number;
  updateRate?: number;
}

interface FrequencyBin {
  frequency: number;
  magnitude: number;
  peak: number;
  peakTime: number;
}

export const SpectrumAnalyzer: React.FC<SpectrumAnalyzerProps> = ({
  audioData,
  width = 800,
  height = 300,
  className,
  variant = 'standard',
  minFreq = 20,
  maxFreq = 20000,
  minDb = -80,
  maxDb = 0,
  fftSize = 2048,
  smoothing = 0.8,
  showGrid = true,
  showLabels = true,
  showPeakHold = true,
  realTime = true,
  logarithmic = true,
  colorScheme = 'blue',
  customColors,
  peakHoldTime = 2000,
  updateRate = 60
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frequencyBins, setFrequencyBins] = useState<FrequencyBin[]>([]);
  const [waterfallHistory, setWaterfallHistory] = useState<Float32Array[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Generate frequency bins
  const generateFrequencyBins = useCallback((): FrequencyBin[] => {
    const bins: FrequencyBin[] = [];
    const nyquist = 22050; // Half of 44.1kHz
    const binCount = logarithmic ? 100 : fftSize / 2;

    for (let i = 0; i < binCount; i++) {
      let frequency: number;

      if (logarithmic) {
        const logMin = Math.log10(minFreq);
        const logMax = Math.log10(maxFreq);
        const logStep = (logMax - logMin) / (binCount - 1);
        frequency = Math.pow(10, logMin + i * logStep);
      } else {
        frequency = (i / (binCount - 1)) * (maxFreq - minFreq) + minFreq;
      }

      bins.push({
        frequency,
        magnitude: minDb,
        peak: minDb,
        peakTime: 0
      });
    }

    return bins;
  }, [minFreq, maxFreq, fftSize, logarithmic]);

  // Calculate FFT and update frequency bins
  const updateSpectrum = useCallback((inputData: Float32Array) => {
    if (!inputData || inputData.length === 0) return;

    // Simple FFT implementation (in real app, use Web Audio API AnalyserNode)
    const spectrum = performFFT(inputData, fftSize);
    const newBins = generateFrequencyBins();
    const currentTime = performance.now();

    newBins.forEach((bin, index) => {
      // Map frequency to FFT bin
      const fftBinIndex = Math.floor((bin.frequency / 22050) * (spectrum.length - 1));
      const magnitude = spectrum[fftBinIndex] || minDb;

      // Apply smoothing
      const previousBin = frequencyBins[index];
      if (previousBin) {
        bin.magnitude = previousBin.magnitude * smoothing + magnitude * (1 - smoothing);

        // Update peak hold
        if (magnitude > previousBin.peak ||
            (currentTime - previousBin.peakTime) > peakHoldTime) {
          bin.peak = magnitude;
          bin.peakTime = currentTime;
        } else {
          bin.peak = previousBin.peak;
          bin.peakTime = previousBin.peakTime;
        }
      } else {
        bin.magnitude = magnitude;
        bin.peak = magnitude;
        bin.peakTime = currentTime;
      }
    });

    setFrequencyBins(newBins);

    // Update waterfall history for waterfall display
    if (variant === 'waterfall') {
      const magnitudes = new Float32Array(newBins.map(bin => bin.magnitude));
      setWaterfallHistory(prev => {
        const newHistory = [magnitudes, ...prev];
        return newHistory.slice(0, height); // Keep only as many as needed for display
      });
    }
  }, [frequencyBins, smoothing, peakHoldTime, generateFrequencyBins, fftSize, minDb, variant, height]);

  // Simple FFT implementation (placeholder - use Web Audio API in real implementation)
  const performFFT = useCallback((data: Float32Array, size: number): Float32Array => {
    const spectrum = new Float32Array(size / 2);

    // This is a simplified placeholder - real implementation would use proper FFT
    for (let i = 0; i < spectrum.length; i++) {
      const frequency = (i / spectrum.length) * 22050;
      const amplitude = Math.random() * 60 - 80; // Random data for demo
      spectrum[i] = amplitude;
    }

    return spectrum;
  }, []);

  // Get color for magnitude
  const getColor = useCallback((magnitude: number, alpha: number = 1): string => {
    const normalizedMag = (magnitude - minDb) / (maxDb - minDb);
    const clampedMag = Math.max(0, Math.min(1, normalizedMag));

    if (customColors && customColors.length > 0) {
      const index = Math.floor(clampedMag * (customColors.length - 1));
      return customColors[index] || customColors[0] || '#000000';
    }

    switch (colorScheme) {
      case 'green':
        return `rgba(${Math.floor(255 * (1 - clampedMag))}, 255, ${Math.floor(255 * (1 - clampedMag))}, ${alpha})`;

      case 'rainbow':
        const hue = clampedMag * 240; // Blue to red
        return `hsla(${hue}, 100%, 50%, ${alpha})`;

      case 'fire':
        if (clampedMag < 0.5) {
          return `rgba(${Math.floor(255 * clampedMag * 2)}, 0, 0, ${alpha})`;
        } else {
          return `rgba(255, ${Math.floor(255 * (clampedMag - 0.5) * 2)}, 0, ${alpha})`;
        }

      case 'ice':
        return `rgba(${Math.floor(255 * (1 - clampedMag))}, ${Math.floor(255 * (1 - clampedMag))}, 255, ${alpha})`;

      default: // blue
        return `rgba(${Math.floor(100 * clampedMag)}, ${Math.floor(150 * clampedMag)}, ${Math.floor(255 * clampedMag)}, ${alpha})`;
    }
  }, [minDb, maxDb, colorScheme, customColors]);

  // Draw spectrum
  const drawSpectrum = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || frequencyBins.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    if (showGrid) {
      drawGrid(ctx);
    }

    // Draw spectrum based on variant
    switch (variant) {
      case 'bars':
        drawBars(ctx);
        break;
      case 'line':
        drawLine(ctx);
        break;
      case 'waterfall':
        drawWaterfall(ctx);
        break;
      case 'professional':
        drawProfessional(ctx);
        break;
      case 'minimal':
        drawMinimal(ctx);
        break;
      default:
        drawStandard(ctx);
        break;
    }

    // Draw labels
    if (showLabels) {
      drawLabels(ctx);
    }

  }, [
    frequencyBins, width, height, showGrid, showLabels, variant,
    waterfallHistory, getColor, minDb, maxDb, showPeakHold
  ]);

  // Draw grid
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;

    // Frequency grid lines
    const freqLines = [100, 1000, 10000];
    freqLines.forEach(freq => {
      if (freq >= minFreq && freq <= maxFreq) {
        const x = frequencyToX(freq);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    });

    // dB grid lines
    const dbLines = [-60, -40, -20, 0];
    dbLines.forEach(db => {
      if (db >= minDb && db <= maxDb) {
        const y = dbToY(db);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    });
  }, [minFreq, maxFreq, minDb, maxDb, width, height]);

  // Convert frequency to X position
  const frequencyToX = useCallback((freq: number): number => {
    if (logarithmic) {
      const logMin = Math.log10(minFreq);
      const logMax = Math.log10(maxFreq);
      const logFreq = Math.log10(freq);
      return ((logFreq - logMin) / (logMax - logMin)) * width;
    } else {
      return ((freq - minFreq) / (maxFreq - minFreq)) * width;
    }
  }, [minFreq, maxFreq, width, logarithmic]);

  // Convert dB to Y position
  const dbToY = useCallback((db: number): number => {
    return height - ((db - minDb) / (maxDb - minDb)) * height;
  }, [minDb, maxDb, height]);

  // Draw standard spectrum
  const drawStandard = useCallback((ctx: CanvasRenderingContext2D) => {
    const binWidth = width / frequencyBins.length;

    frequencyBins.forEach((bin, index) => {
      const x = index * binWidth;
      const barHeight = ((bin.magnitude - minDb) / (maxDb - minDb)) * height;

      // Draw magnitude bar
      ctx.fillStyle = getColor(bin.magnitude);
      ctx.fillRect(x, height - barHeight, binWidth - 1, barHeight);

      // Draw peak hold
      if (showPeakHold) {
        const peakY = dbToY(bin.peak);
        ctx.fillStyle = getColor(bin.peak, 0.8);
        ctx.fillRect(x, peakY - 1, binWidth - 1, 2);
      }
    });
  }, [frequencyBins, width, height, minDb, maxDb, getColor, showPeakHold, dbToY]);

  // Draw bars variant
  const drawBars = useCallback((ctx: CanvasRenderingContext2D) => {
    const binWidth = width / frequencyBins.length;

    frequencyBins.forEach((bin, index) => {
      const x = index * binWidth;
      const barHeight = ((bin.magnitude - minDb) / (maxDb - minDb)) * height;

      // Gradient bar
      const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
      gradient.addColorStop(0, getColor(minDb));
      gradient.addColorStop(1, getColor(bin.magnitude));

      ctx.fillStyle = gradient;
      ctx.fillRect(x + 1, height - barHeight, binWidth - 2, barHeight);

      // 3D effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x + 1, height - barHeight, 2, barHeight);
    });
  }, [frequencyBins, width, height, minDb, maxDb, getColor]);

  // Draw line variant
  const drawLine = useCallback((ctx: CanvasRenderingContext2D) => {
    if (frequencyBins.length === 0) return;

    ctx.strokeStyle = getColor(maxDb);
    ctx.lineWidth = 2;
    ctx.beginPath();

    frequencyBins.forEach((bin, index) => {
      const x = (index / (frequencyBins.length - 1)) * width;
      const y = dbToY(bin.magnitude);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Fill area under curve
    ctx.fillStyle = getColor(maxDb, 0.3);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  }, [frequencyBins, width, height, getColor, maxDb, dbToY]);

  // Draw waterfall variant
  const drawWaterfall = useCallback((ctx: CanvasRenderingContext2D) => {
    waterfallHistory.forEach((spectrum, timeIndex) => {
      spectrum.forEach((magnitude, freqIndex) => {
        const x = (freqIndex / (spectrum.length - 1)) * width;
        const y = timeIndex;

        ctx.fillStyle = getColor(magnitude);
        ctx.fillRect(x, y, width / spectrum.length, 1);
      });
    });
  }, [waterfallHistory, width, getColor]);

  // Draw professional variant
  const drawProfessional = useCallback((ctx: CanvasRenderingContext2D) => {
    // Similar to standard but with more details
    drawStandard(ctx);

    // Add RTA-style peak indicators
    frequencyBins.forEach((bin, index) => {
      if (bin.magnitude > maxDb - 10) { // Hot signal
        const x = (index / (frequencyBins.length - 1)) * width;
        const y = dbToY(bin.magnitude);

        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [frequencyBins, width, drawStandard, maxDb, dbToY]);

  // Draw minimal variant
  const drawMinimal = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = getColor(maxDb);
    ctx.lineWidth = 1;
    ctx.beginPath();

    frequencyBins.forEach((bin, index) => {
      const x = (index / (frequencyBins.length - 1)) * width;
      const y = dbToY(bin.magnitude);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }, [frequencyBins, width, getColor, maxDb, dbToY]);

  // Draw labels
  const drawLabels = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '12px sans-serif';

    // Frequency labels
    const freqLabels = [100, 1000, 10000];
    freqLabels.forEach(freq => {
      if (freq >= minFreq && freq <= maxFreq) {
        const x = frequencyToX(freq);
        const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
        ctx.fillText(label, x - 10, height - 5);
      }
    });

    // dB labels
    const dbLabels = [-60, -40, -20, 0];
    dbLabels.forEach(db => {
      if (db >= minDb && db <= maxDb) {
        const y = dbToY(db);
        ctx.fillText(`${db}dB`, 5, y - 5);
      }
    });
  }, [minFreq, maxFreq, minDb, maxDb, frequencyToX, dbToY, height]);

  // Animation loop
  useEffect(() => {
    if (!realTime) {
      drawSpectrum();
      return;
    }

    const animate = (timestamp: number) => {
      if (timestamp - lastUpdateRef.current >= 1000 / updateRate) {
        if (audioData) {
          updateSpectrum(audioData);
        }
        drawSpectrum();
        lastUpdateRef.current = timestamp;
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [realTime, audioData, updateSpectrum, drawSpectrum, updateRate]);

  // Initialize frequency bins
  useEffect(() => {
    setFrequencyBins(generateFrequencyBins());
  }, [generateFrequencyBins]);

  return (
    <div className={cn('relative', className)}>
      <canvas
        ref={canvasRef}
        className="block"
        width={width}
        height={height}
      />

      {/* Controls overlay */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 text-xs text-white bg-black bg-opacity-50 p-2 rounded">
        <div>Range: {minFreq}Hz - {maxFreq/1000}kHz</div>
        <div>Scale: {minDb}dB to {maxDb}dB</div>
        {variant === 'waterfall' && (
          <div>History: {waterfallHistory.length} frames</div>
        )}
      </div>
    </div>
  );
};