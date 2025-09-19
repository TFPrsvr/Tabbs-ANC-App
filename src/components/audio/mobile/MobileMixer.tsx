'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { TouchKnob, TouchFader } from './TouchControls';

export interface MobileChannelConfig {
  id: number;
  name: string;
  color?: string;
  gain: number;
  eq: {
    high: number;
    mid: number;
    low: number;
  };
  auxSend: number;
  pan: number;
  volume: number;
  muted: boolean;
  solo: boolean;
  signalLevel: number;
}

export interface MobileMixerProps {
  channels: MobileChannelConfig[];
  onChannelChange: (channelId: number, changes: Partial<MobileChannelConfig>) => void;
  masterVolume: number;
  onMasterVolumeChange: (volume: number) => void;
  variant?: 'compact' | 'standard' | 'tablet';
  orientation?: 'portrait' | 'landscape';
  className?: string;
}

export const MobileMixer: React.FC<MobileMixerProps> = ({
  channels,
  onChannelChange,
  masterVolume,
  onMasterVolumeChange,
  variant = 'standard',
  orientation = 'portrait',
  className
}) => {
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);
  const [showEQ, setShowEQ] = useState(false);
  const [showSends, setShowSends] = useState(false);

  const handleChannelChange = useCallback((channelId: number, changes: Partial<MobileChannelConfig>) => {
    onChannelChange(channelId, changes);
  }, [onChannelChange]);

  const handleMute = useCallback((channelId: number) => {
    const channel = channels.find(ch => ch.id === channelId);
    if (channel) {
      handleChannelChange(channelId, { muted: !channel.muted });
    }
  }, [channels, handleChannelChange]);

  const handleSolo = useCallback((channelId: number) => {
    const channel = channels.find(ch => ch.id === channelId);
    if (channel) {
      handleChannelChange(channelId, { solo: !channel.solo });
    }
  }, [channels, handleChannelChange]);

  // Render compact channel strip (for compact variant)
  const renderCompactChannel = useCallback((channel: MobileChannelConfig) => (
    <div
      key={channel.id}
      className={cn(
        'flex flex-col items-center gap-2 p-2 border rounded-lg min-w-16',
        selectedChannel === channel.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600',
        'bg-white dark:bg-gray-800'
      )}
      onClick={() => setSelectedChannel(channel.id)}
    >
      {/* Channel number */}
      <div className="text-xs font-bold text-gray-600 dark:text-gray-400">
        {channel.id}
      </div>

      {/* Volume fader */}
      <TouchFader
        value={channel.volume}
        onChange={(volume) => handleChannelChange(channel.id, { volume })}
        min={0}
        max={100}
        size="sm"
        className="flex-1"
      />

      {/* Level meter */}
      <div className="w-2 h-16 bg-gray-700 rounded relative overflow-hidden">
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 transition-all duration-100',
            channel.signalLevel > 90 ? 'bg-red-500' :
            channel.signalLevel > 75 ? 'bg-yellow-500' :
            'bg-green-500'
          )}
          style={{ height: `${channel.signalLevel}%` }}
        />
      </div>

      {/* Mute/Solo buttons */}
      <div className="flex flex-col gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleMute(channel.id);
          }}
          className={cn(
            'w-8 h-6 text-xs font-bold rounded',
            channel.muted
              ? 'bg-red-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          )}
        >
          M
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSolo(channel.id);
          }}
          className={cn(
            'w-8 h-6 text-xs font-bold rounded',
            channel.solo
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          )}
        >
          S
        </button>
      </div>
    </div>
  ), [selectedChannel, handleChannelChange, handleMute, handleSolo]);

  // Render standard channel strip
  const renderStandardChannel = useCallback((channel: MobileChannelConfig) => (
    <div
      key={channel.id}
      className={cn(
        'flex flex-col items-center gap-3 p-3 border rounded-lg',
        selectedChannel === channel.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600',
        'bg-white dark:bg-gray-800 min-w-20'
      )}
      onClick={() => setSelectedChannel(channel.id)}
    >
      {/* Channel info */}
      <div className="text-center">
        <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
          {channel.id}
        </div>
        <div className="text-xs text-gray-500 truncate max-w-16">
          {channel.name}
        </div>
      </div>

      {/* Gain control */}
      <TouchKnob
        value={channel.gain}
        onChange={(gain) => handleChannelChange(channel.id, { gain })}
        min={-20}
        max={60}
        step={0.5}
        label="GAIN"
        unit="dB"
        size="sm"
      />

      {/* EQ section (if expanded) */}
      {selectedChannel === channel.id && showEQ && (
        <div className="flex flex-col gap-2 border-t border-gray-200 dark:border-gray-600 pt-2">
          <div className="text-xs font-medium text-gray-600 text-center">EQ</div>
          <TouchKnob
            value={channel.eq.high}
            onChange={(high) => handleChannelChange(channel.id, {
              eq: { ...channel.eq, high }
            })}
            min={-15}
            max={15}
            step={0.5}
            label="HI"
            unit="dB"
            size="sm"
          />
          <TouchKnob
            value={channel.eq.mid}
            onChange={(mid) => handleChannelChange(channel.id, {
              eq: { ...channel.eq, mid }
            })}
            min={-15}
            max={15}
            step={0.5}
            label="MID"
            unit="dB"
            size="sm"
          />
          <TouchKnob
            value={channel.eq.low}
            onChange={(low) => handleChannelChange(channel.id, {
              eq: { ...channel.eq, low }
            })}
            min={-15}
            max={15}
            step={0.5}
            label="LO"
            unit="dB"
            size="sm"
          />
        </div>
      )}

      {/* Aux send (if expanded) */}
      {selectedChannel === channel.id && showSends && (
        <div className="flex flex-col gap-2 border-t border-gray-200 dark:border-gray-600 pt-2">
          <TouchKnob
            value={channel.auxSend}
            onChange={(auxSend) => handleChannelChange(channel.id, { auxSend })}
            min={0}
            max={100}
            label="AUX"
            unit="%"
            size="sm"
          />
        </div>
      )}

      {/* Pan control */}
      <TouchKnob
        value={channel.pan}
        onChange={(pan) => handleChannelChange(channel.id, { pan })}
        min={-100}
        max={100}
        label="PAN"
        size="sm"
      />

      {/* Volume fader */}
      <TouchFader
        value={channel.volume}
        onChange={(volume) => handleChannelChange(channel.id, { volume })}
        min={0}
        max={100}
        size="md"
        className="flex-1"
      />

      {/* Control buttons */}
      <div className="flex flex-col gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleMute(channel.id);
          }}
          className={cn(
            'w-10 h-8 text-xs font-bold rounded',
            channel.muted
              ? 'bg-red-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          )}
        >
          MUTE
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSolo(channel.id);
          }}
          className={cn(
            'w-10 h-8 text-xs font-bold rounded',
            channel.solo
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          )}
        >
          SOLO
        </button>
      </div>

      {/* Level meter */}
      <div className="w-3 h-20 bg-gray-700 rounded relative overflow-hidden">
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 transition-all duration-100',
            channel.signalLevel > 90 ? 'bg-red-500' :
            channel.signalLevel > 75 ? 'bg-yellow-500' :
            'bg-green-500'
          )}
          style={{ height: `${channel.signalLevel}%` }}
        />
      </div>
    </div>
  ), [selectedChannel, showEQ, showSends, handleChannelChange, handleMute, handleSolo]);

  // Render tablet layout
  const renderTabletChannel = useCallback((channel: MobileChannelConfig) => (
    <div
      key={channel.id}
      className={cn(
        'flex flex-row items-center gap-4 p-4 border rounded-lg',
        selectedChannel === channel.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600',
        'bg-white dark:bg-gray-800'
      )}
      onClick={() => setSelectedChannel(channel.id)}
    >
      {/* Channel info */}
      <div className="flex flex-col items-center min-w-16">
        <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
          {channel.id}
        </div>
        <div className="text-sm text-gray-500 text-center">
          {channel.name}
        </div>
      </div>

      {/* EQ section */}
      <div className="flex gap-3">
        <TouchKnob
          value={channel.eq.high}
          onChange={(high) => handleChannelChange(channel.id, {
            eq: { ...channel.eq, high }
          })}
          min={-15}
          max={15}
          step={0.5}
          label="HIGH"
          unit="dB"
          size="md"
        />
        <TouchKnob
          value={channel.eq.mid}
          onChange={(mid) => handleChannelChange(channel.id, {
            eq: { ...channel.eq, mid }
          })}
          min={-15}
          max={15}
          step={0.5}
          label="MID"
          unit="dB"
          size="md"
        />
        <TouchKnob
          value={channel.eq.low}
          onChange={(low) => handleChannelChange(channel.id, {
            eq: { ...channel.eq, low }
          })}
          min={-15}
          max={15}
          step={0.5}
          label="LOW"
          unit="dB"
          size="md"
        />
      </div>

      {/* Aux and Pan */}
      <div className="flex gap-3">
        <TouchKnob
          value={channel.auxSend}
          onChange={(auxSend) => handleChannelChange(channel.id, { auxSend })}
          min={0}
          max={100}
          label="AUX"
          unit="%"
          size="md"
        />
        <TouchKnob
          value={channel.pan}
          onChange={(pan) => handleChannelChange(channel.id, { pan })}
          min={-100}
          max={100}
          label="PAN"
          size="md"
        />
      </div>

      {/* Fader and controls */}
      <div className="flex items-center gap-3">
        <TouchFader
          value={channel.volume}
          onChange={(volume) => handleChannelChange(channel.id, { volume })}
          min={0}
          max={100}
          size="lg"
          orientation={orientation === 'landscape' ? 'horizontal' : 'vertical'}
        />

        <div className="flex flex-col gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMute(channel.id);
            }}
            className={cn(
              'w-12 h-10 text-sm font-bold rounded',
              channel.muted
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            )}
          >
            MUTE
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSolo(channel.id);
            }}
            className={cn(
              'w-12 h-10 text-sm font-bold rounded',
              channel.solo
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            )}
          >
            SOLO
          </button>
        </div>

        {/* Level meter */}
        <div className="w-4 h-24 bg-gray-700 rounded relative overflow-hidden">
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 transition-all duration-100',
              channel.signalLevel > 90 ? 'bg-red-500' :
              channel.signalLevel > 75 ? 'bg-yellow-500' :
              'bg-green-500'
            )}
            style={{ height: `${channel.signalLevel}%` }}
          />
        </div>
      </div>
    </div>
  ), [selectedChannel, orientation, handleChannelChange, handleMute, handleSolo]);

  // Render master section
  const renderMasterSection = () => (
    <div className={cn(
      'flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg',
      orientation === 'landscape' && variant !== 'compact' ? 'flex-row' : 'flex-col'
    )}>
      <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
        MASTER
      </div>

      <TouchFader
        value={masterVolume}
        onChange={onMasterVolumeChange}
        min={0}
        max={100}
        size={variant === 'tablet' ? 'lg' : 'md'}
        label="VOLUME"
        unit="%"
        orientation={orientation === 'landscape' && variant !== 'compact' ? 'horizontal' : 'vertical'}
      />

      {/* Master level meter */}
      <div className={cn(
        'bg-gray-700 rounded relative overflow-hidden',
        orientation === 'landscape' && variant !== 'compact'
          ? 'w-32 h-4' : 'w-4 h-32'
      )}>
        <div
          className="absolute bg-green-500 transition-all duration-100"
          style={orientation === 'landscape' && variant !== 'compact' ? {
            left: 0,
            top: 0,
            bottom: 0,
            width: `${masterVolume}%`
          } : {
            left: 0,
            right: 0,
            bottom: 0,
            height: `${masterVolume}%`
          }}
        />
      </div>
    </div>
  );

  // Render channel controls overlay (for compact variant)
  const renderChannelControlsOverlay = () => {
    if (!selectedChannel || variant !== 'compact') return null;

    const channel = channels.find(ch => ch.id === selectedChannel);
    if (!channel) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Channel {channel.id}</h3>
            <button
              onClick={() => setSelectedChannel(null)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Gain */}
            <TouchKnob
              value={channel.gain}
              onChange={(gain) => handleChannelChange(channel.id, { gain })}
              min={-20}
              max={60}
              step={0.5}
              label="GAIN"
              unit="dB"
              size="md"
            />

            {/* Pan */}
            <TouchKnob
              value={channel.pan}
              onChange={(pan) => handleChannelChange(channel.id, { pan })}
              min={-100}
              max={100}
              label="PAN"
              size="md"
            />

            {/* EQ */}
            <TouchKnob
              value={channel.eq.high}
              onChange={(high) => handleChannelChange(channel.id, {
                eq: { ...channel.eq, high }
              })}
              min={-15}
              max={15}
              step={0.5}
              label="HIGH"
              unit="dB"
              size="md"
            />

            <TouchKnob
              value={channel.eq.mid}
              onChange={(mid) => handleChannelChange(channel.id, {
                eq: { ...channel.eq, mid }
              })}
              min={-15}
              max={15}
              step={0.5}
              label="MID"
              unit="dB"
              size="md"
            />

            <TouchKnob
              value={channel.eq.low}
              onChange={(low) => handleChannelChange(channel.id, {
                eq: { ...channel.eq, low }
              })}
              min={-15}
              max={15}
              step={0.5}
              label="LOW"
              unit="dB"
              size="md"
            />

            {/* Aux Send */}
            <TouchKnob
              value={channel.auxSend}
              onChange={(auxSend) => handleChannelChange(channel.id, { auxSend })}
              min={0}
              max={100}
              label="AUX"
              unit="%"
              size="md"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderChannels = () => {
    switch (variant) {
      case 'compact':
        return channels.map(renderCompactChannel);
      case 'tablet':
        return channels.map(renderTabletChannel);
      default:
        return channels.map(renderStandardChannel);
    }
  };

  return (
    <div className={cn(
      'flex gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-x-auto',
      orientation === 'landscape' && variant === 'tablet' ? 'flex-col' : 'flex-row',
      className
    )}>
      {/* Channel strips */}
      <div className={cn(
        'flex gap-3',
        orientation === 'landscape' && variant === 'tablet' ? 'flex-col' : 'flex-row'
      )}>
        {renderChannels()}
      </div>

      {/* Master section */}
      {renderMasterSection()}

      {/* Channel controls overlay */}
      {renderChannelControlsOverlay()}

      {/* Control buttons overlay for standard variant */}
      {variant === 'standard' && selectedChannel && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black bg-opacity-80 rounded-lg p-2">
          <button
            onClick={() => setShowEQ(!showEQ)}
            className={cn(
              'px-3 py-2 text-white text-sm font-medium rounded',
              showEQ ? 'bg-blue-500' : 'bg-gray-600'
            )}
          >
            EQ
          </button>
          <button
            onClick={() => setShowSends(!showSends)}
            className={cn(
              'px-3 py-2 text-white text-sm font-medium rounded',
              showSends ? 'bg-blue-500' : 'bg-gray-600'
            )}
          >
            SENDS
          </button>
          <button
            onClick={() => setSelectedChannel(null)}
            className="px-3 py-2 text-white text-sm font-medium rounded bg-gray-600"
          >
            CLOSE
          </button>
        </div>
      )}
    </div>
  );
};