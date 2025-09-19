'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { AudioKnob, AudioFader, AudioButton, MuteButton, SoloButton, AudioSwitch } from '../controls';

export interface ChannelStripProps {
  channelNumber: number;
  label?: string;
  className?: string;
  variant?: 'minimal' | 'standard' | 'professional' | 'broadcast';
  width?: 'narrow' | 'standard' | 'wide';

  // Audio parameters
  gain?: number;
  onGainChange?: (gain: number) => void;

  highEQ?: number;
  midEQ?: number;
  lowEQ?: number;
  onEQChange?: (band: 'high' | 'mid' | 'low', value: number) => void;

  aux1Send?: number;
  aux2Send?: number;
  aux3Send?: number;
  aux4Send?: number;
  onAuxSendChange?: (aux: 1 | 2 | 3 | 4, value: number) => void;

  pan?: number;
  onPanChange?: (pan: number) => void;

  volume?: number;
  onVolumeChange?: (volume: number) => void;

  // States
  muted?: boolean;
  onMuteChange?: (muted: boolean) => void;

  solo?: boolean;
  onSoloChange?: (solo: boolean) => void;

  armed?: boolean;
  onArmChange?: (armed: boolean) => void;

  phantom?: boolean;
  onPhantomChange?: (phantom: boolean) => void;

  highpass?: boolean;
  onHighpassChange?: (highpass: boolean) => void;

  // Monitoring
  signalLevel?: number;
  clipDetected?: boolean;

  // Routing
  busAssignments?: number[];
  onBusAssignmentChange?: (bus: number, assigned: boolean) => void;
}

const widthClasses = {
  narrow: 'w-16',
  standard: 'w-20',
  wide: 'w-24'
};

export const ChannelStrip: React.FC<ChannelStripProps> = ({
  channelNumber,
  label = `CH ${channelNumber}`,
  className,
  variant = 'standard',
  width = 'standard',

  gain = 0,
  onGainChange,

  highEQ = 0,
  midEQ = 0,
  lowEQ = 0,
  onEQChange,

  aux1Send = 0,
  aux2Send = 0,
  aux3Send = 0,
  aux4Send = 0,
  onAuxSendChange,

  pan = 0,
  onPanChange,

  volume = 75,
  onVolumeChange,

  muted = false,
  onMuteChange,

  solo = false,
  onSoloChange,

  armed = false,
  onArmChange,

  phantom = false,
  onPhantomChange,

  highpass = false,
  onHighpassChange,

  signalLevel = 0,
  clipDetected = false,

  busAssignments = [],
  onBusAssignmentChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEQChange = useCallback((band: 'high' | 'mid' | 'low') => (value: number) => {
    onEQChange?.(band, value);
  }, [onEQChange]);

  const handleAuxSendChange = useCallback((aux: 1 | 2 | 3 | 4) => (value: number) => {
    onAuxSendChange?.(aux, value);
  }, [onAuxSendChange]);

  const renderMinimal = () => (
    <div className="flex flex-col gap-2 items-center">
      {/* Volume Fader */}
      <AudioFader
        value={volume}
        onChange={onVolumeChange}
        min={0}
        max={100}
        size="sm"
        showValue={false}
        className="flex-1 min-h-32"
      />

      {/* Mute/Solo */}
      <div className="flex flex-col gap-1">
        <MuteButton
          active={muted}
          onClick={() => onMuteChange?.(!muted)}
          size="sm"
        />
        <SoloButton
          active={solo}
          onClick={() => onSoloChange?.(!solo)}
          size="sm"
        />
      </div>

      {/* Channel Label */}
      <div className="text-xs text-center font-medium text-gray-700 dark:text-gray-300">
        {channelNumber}
      </div>
    </div>
  );

  const renderStandard = () => (
    <div className="flex flex-col gap-3 items-center py-2">
      {/* Channel Label */}
      <div className="text-xs text-center font-medium text-gray-700 dark:text-gray-300 px-2">
        <div className="truncate">{label}</div>
        <div className="text-gray-500">CH{channelNumber}</div>
      </div>

      {/* Input Controls */}
      <div className="flex flex-col gap-2 items-center">
        {/* Gain */}
        <AudioKnob
          value={gain}
          onChange={onGainChange}
          min={-20}
          max={60}
          label="GAIN"
          unit="dB"
          size="sm"
          bipolar
          precision={1}
        />

        {/* Phantom Power & High Pass */}
        <div className="flex gap-1">
          <AudioSwitch
            checked={phantom}
            onChange={onPhantomChange}
            variant="toggle"
            size="sm"
            color="red"
            label="+48V"
            labelPosition="bottom"
          />
          <AudioSwitch
            checked={highpass}
            onChange={onHighpassChange}
            variant="toggle"
            size="sm"
            color="blue"
            label="HPF"
            labelPosition="bottom"
          />
        </div>
      </div>

      {/* EQ Section */}
      <div className="flex flex-col gap-2 items-center border-t border-gray-300 pt-2">
        <div className="text-xs font-medium text-gray-600">EQ</div>
        <AudioKnob
          value={highEQ}
          onChange={handleEQChange('high')}
          min={-15}
          max={15}
          label="HI"
          unit="dB"
          size="sm"
          bipolar
          precision={1}
        />
        <AudioKnob
          value={midEQ}
          onChange={handleEQChange('mid')}
          min={-15}
          max={15}
          label="MID"
          unit="dB"
          size="sm"
          bipolar
          precision={1}
        />
        <AudioKnob
          value={lowEQ}
          onChange={handleEQChange('low')}
          min={-15}
          max={15}
          label="LO"
          unit="dB"
          size="sm"
          bipolar
          precision={1}
        />
      </div>

      {/* Aux Sends */}
      <div className="flex flex-col gap-2 items-center border-t border-gray-300 pt-2">
        <div className="text-xs font-medium text-gray-600">AUX</div>
        <AudioKnob
          value={aux1Send}
          onChange={handleAuxSendChange(1)}
          min={0}
          max={100}
          label="1"
          size="sm"
          precision={0}
        />
        <AudioKnob
          value={aux2Send}
          onChange={handleAuxSendChange(2)}
          min={0}
          max={100}
          label="2"
          size="sm"
          precision={0}
        />
      </div>

      {/* Pan */}
      <AudioKnob
        value={pan}
        onChange={onPanChange}
        min={-100}
        max={100}
        label="PAN"
        size="sm"
        bipolar
        precision={0}
      />

      {/* Volume Fader */}
      <AudioFader
        value={volume}
        onChange={onVolumeChange}
        min={0}
        max={100}
        size="sm"
        showValue={false}
        className="flex-1 min-h-48"
        detentValue={75}
      />

      {/* Mute/Solo/Arm */}
      <div className="flex flex-col gap-1">
        <AudioButton
          onClick={() => onArmChange?.(!armed)}
          variant="record"
          active={armed}
          size="sm"
          shape="round"
        >
          R
        </AudioButton>
        <MuteButton
          active={muted}
          onClick={() => onMuteChange?.(!muted)}
          size="sm"
        />
        <SoloButton
          active={solo}
          onClick={() => onSoloChange?.(!solo)}
          size="sm"
        />
      </div>

      {/* Signal Level Meter */}
      <div className="w-2 h-20 bg-gray-700 rounded relative overflow-hidden">
        {/* Level bars */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 transition-all duration-100',
            signalLevel > 90 ? 'bg-red-500' :
            signalLevel > 75 ? 'bg-yellow-500' :
            'bg-green-500'
          )}
          style={{ height: `${signalLevel}%` }}
        />

        {/* Clip indicator */}
        {clipDetected && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 animate-pulse" />
        )}
      </div>
    </div>
  );

  const renderProfessional = () => (
    <div className="flex flex-col gap-2 items-center py-2">
      {/* Channel Label with Expand Button */}
      <div className="flex flex-col items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-center font-medium text-gray-700 dark:text-gray-300 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          <div className="truncate">{label}</div>
          <div className="text-gray-500">CH{channelNumber}</div>
        </button>
      </div>

      {/* Input Section */}
      <div className="flex flex-col gap-2 items-center">
        <AudioKnob
          value={gain}
          onChange={onGainChange}
          min={-20}
          max={60}
          label="GAIN"
          unit="dB"
          size="sm"
          variant="professional"
          bipolar
          precision={1}
        />

        <div className="flex gap-1">
          <AudioSwitch
            checked={phantom}
            onChange={onPhantomChange}
            variant="toggle"
            size="sm"
            color="red"
            label="+48V"
            labelPosition="bottom"
          />
          <AudioSwitch
            checked={highpass}
            onChange={onHighpassChange}
            variant="toggle"
            size="sm"
            color="blue"
            label="HPF"
            labelPosition="bottom"
          />
        </div>
      </div>

      {/* EQ Section */}
      <div className="flex flex-col gap-2 items-center border-t border-gray-300 pt-2">
        <div className="text-xs font-medium text-gray-600">EQ</div>
        <AudioKnob
          value={highEQ}
          onChange={handleEQChange('high')}
          min={-15}
          max={15}
          label="HI"
          unit="dB"
          size="sm"
          variant="professional"
          bipolar
          precision={1}
        />
        <AudioKnob
          value={midEQ}
          onChange={handleEQChange('mid')}
          min={-15}
          max={15}
          label="MID"
          unit="dB"
          size="sm"
          variant="professional"
          bipolar
          precision={1}
        />
        <AudioKnob
          value={lowEQ}
          onChange={handleEQChange('low')}
          min={-15}
          max={15}
          label="LO"
          unit="dB"
          size="sm"
          variant="professional"
          bipolar
          precision={1}
        />
      </div>

      {/* Aux Sends */}
      <div className="flex flex-col gap-2 items-center border-t border-gray-300 pt-2">
        <div className="text-xs font-medium text-gray-600">AUX</div>
        <div className="grid grid-cols-2 gap-1">
          <AudioKnob
            value={aux1Send}
            onChange={handleAuxSendChange(1)}
            min={0}
            max={100}
            label="1"
            size="sm"
            precision={0}
          />
          <AudioKnob
            value={aux2Send}
            onChange={handleAuxSendChange(2)}
            min={0}
            max={100}
            label="2"
            size="sm"
            precision={0}
          />
          <AudioKnob
            value={aux3Send}
            onChange={handleAuxSendChange(3)}
            min={0}
            max={100}
            label="3"
            size="sm"
            precision={0}
          />
          <AudioKnob
            value={aux4Send}
            onChange={handleAuxSendChange(4)}
            min={0}
            max={100}
            label="4"
            size="sm"
            precision={0}
          />
        </div>
      </div>

      {/* Bus Assignment (if expanded) */}
      {isExpanded && (
        <div className="flex flex-col gap-2 items-center border-t border-gray-300 pt-2">
          <div className="text-xs font-medium text-gray-600">BUS</div>
          <div className="grid grid-cols-2 gap-1">
            {[1, 2, 3, 4].map(bus => (
              <AudioButton
                key={bus}
                onClick={() => onBusAssignmentChange?.(bus, !busAssignments.includes(bus))}
                variant="toggle"
                active={busAssignments.includes(bus)}
                size="sm"
              >
                {bus}
              </AudioButton>
            ))}
          </div>
        </div>
      )}

      {/* Pan */}
      <AudioKnob
        value={pan}
        onChange={onPanChange}
        min={-100}
        max={100}
        label="PAN"
        size="sm"
        variant="professional"
        bipolar
        precision={0}
      />

      {/* Volume Fader */}
      <AudioFader
        value={volume}
        onChange={onVolumeChange}
        min={0}
        max={100}
        size="md"
        variant="pro"
        showValue={false}
        showScale
        className="flex-1 min-h-60"
        detentValue={75}
        motorized
      />

      {/* Control Buttons */}
      <div className="flex flex-col gap-1">
        <AudioButton
          onClick={() => onArmChange?.(!armed)}
          variant="record"
          active={armed}
          size="sm"
          shape="round"
        >
          R
        </AudioButton>
        <MuteButton
          active={muted}
          onClick={() => onMuteChange?.(!muted)}
          size="sm"
        />
        <SoloButton
          active={solo}
          onClick={() => onSoloChange?.(!solo)}
          size="sm"
        />
      </div>

      {/* Professional Level Meter */}
      <div className="w-3 h-24 bg-gray-900 rounded border border-gray-600 relative overflow-hidden">
        {/* Meter segments */}
        {Array.from({ length: 12 }, (_, i) => {
          const segmentLevel = (11 - i) * (100 / 12);
          const isLit = signalLevel >= segmentLevel;
          const isRed = segmentLevel > 90;
          const isYellow = segmentLevel > 75 && segmentLevel <= 90;

          return (
            <div
              key={i}
              className={cn(
                'absolute left-0 right-0 h-1 border-b border-gray-800',
                isLit
                  ? isRed
                    ? 'bg-red-500'
                    : isYellow
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                  : 'bg-gray-700'
              )}
              style={{
                top: `${i * (100 / 12)}%`,
                height: `${100 / 12 - 1}%`
              }}
            />
          );
        })}

        {/* Clip indicator */}
        {clipDetected && (
          <div className="absolute -top-1 left-0 right-0 h-2 bg-red-600 animate-pulse rounded-t" />
        )}
      </div>
    </div>
  );

  const renderBroadcast = () => (
    <div className="flex flex-col gap-2 items-center py-2 bg-gray-100 dark:bg-gray-900 rounded">
      {/* Channel Info */}
      <div className="text-center">
        <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{channelNumber}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400 truncate px-1">{label}</div>
      </div>

      {/* On Air / Ready indicators */}
      <div className="flex gap-1">
        <div className={cn(
          'w-3 h-3 rounded-full',
          armed ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
        )} />
        <div className={cn(
          'w-3 h-3 rounded-full',
          !muted && signalLevel > 10 ? 'bg-green-500' : 'bg-gray-400'
        )} />
      </div>

      {/* Simple controls */}
      <AudioKnob
        value={volume}
        onChange={onVolumeChange}
        min={0}
        max={100}
        label="LEVEL"
        size="md"
        variant="vintage"
        precision={0}
      />

      <div className="flex gap-1">
        <AudioButton
          onClick={() => onMuteChange?.(!muted)}
          variant="toggle"
          active={muted}
          size="sm"
          ledColor="red"
        >
          MUTE
        </AudioButton>
      </div>

      {/* Large level meter */}
      <div className="w-4 h-32 bg-black rounded border border-gray-400 relative overflow-hidden">
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 transition-all duration-50',
            signalLevel > 95 ? 'bg-red-600' :
            signalLevel > 85 ? 'bg-yellow-500' :
            'bg-green-500'
          )}
          style={{ height: `${signalLevel}%` }}
        />

        {/* Peak indicator lines */}
        <div className="absolute top-1/4 left-0 right-0 h-px bg-red-400 opacity-50" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-yellow-400 opacity-50" />
        <div className="absolute top-3/4 left-0 right-0 h-px bg-green-400 opacity-50" />
      </div>
    </div>
  );

  const renderChannelStrip = () => {
    switch (variant) {
      case 'minimal':
        return renderMinimal();
      case 'professional':
        return renderProfessional();
      case 'broadcast':
        return renderBroadcast();
      default:
        return renderStandard();
    }
  };

  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm',
      'select-none',
      widthClasses[width],
      className
    )}>
      {renderChannelStrip()}
    </div>
  );
};