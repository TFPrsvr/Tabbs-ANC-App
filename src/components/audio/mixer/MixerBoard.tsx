'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChannelStrip } from './ChannelStrip';
import { AudioKnob, AudioFader, AudioButton } from '../controls';

export interface ChannelConfig {
  id: number;
  label: string;
  type: 'mic' | 'line' | 'instrument' | 'return' | 'bus';

  // Audio settings
  gain: number;
  highEQ: number;
  midEQ: number;
  lowEQ: number;
  aux1Send: number;
  aux2Send: number;
  aux3Send: number;
  aux4Send: number;
  pan: number;
  volume: number;

  // States
  muted: boolean;
  solo: boolean;
  armed: boolean;
  phantom: boolean;
  highpass: boolean;

  // Monitoring
  signalLevel: number;
  clipDetected: boolean;

  // Routing
  busAssignments: number[];
}

export interface MasterSection {
  mainMix: {
    volume: number;
    muted: boolean;
  };
  aux1: {
    volume: number;
    muted: boolean;
  };
  aux2: {
    volume: number;
    muted: boolean;
  };
  aux3: {
    volume: number;
    muted: boolean;
  };
  aux4: {
    volume: number;
    muted: boolean;
  };
  headphones: {
    volume: number;
    source: 'main' | 'aux1' | 'aux2' | 'aux3' | 'aux4';
  };
}

export interface MixerBoardProps {
  channels: ChannelConfig[];
  onChannelChange: (channelId: number, changes: Partial<ChannelConfig>) => void;

  masterSection: MasterSection;
  onMasterChange: (changes: Partial<MasterSection>) => void;

  variant?: 'compact' | 'standard' | 'professional' | 'broadcast';
  className?: string;

  // View options
  showMasterSection?: boolean;
  showAuxReturns?: boolean;
  showBusOutputs?: boolean;
  channelWidth?: 'narrow' | 'standard' | 'wide';

  // Transport controls
  recording?: boolean;
  onRecordingChange?: (recording: boolean) => void;

  // Scene management
  scenes?: MixerScene[];
  currentScene?: number;
  onSceneChange?: (sceneId: number) => void;
  onSceneSave?: (sceneId: number) => void;
}

export interface MixerScene {
  id: number;
  name: string;
  channels: Partial<ChannelConfig>[];
  master: Partial<MasterSection>;
}

export const MixerBoard: React.FC<MixerBoardProps> = ({
  channels,
  onChannelChange,
  masterSection,
  onMasterChange,
  variant = 'standard',
  className,
  showMasterSection = true,
  showAuxReturns = true,
  showBusOutputs = true,
  channelWidth = 'standard',
  recording = false,
  onRecordingChange,
  scenes = [],
  currentScene,
  onSceneChange,
  onSceneSave
}) => {
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
  const [soloMode, setSoloMode] = useState<'off' | 'solo' | 'pfl'>('off');

  // Channel event handlers
  const handleChannelGainChange = useCallback((channelId: number) => (gain: number) => {
    onChannelChange(channelId, { gain });
  }, [onChannelChange]);

  const handleChannelEQChange = useCallback((channelId: number) => (band: 'high' | 'mid' | 'low', value: number) => {
    const changes: Partial<ChannelConfig> = {};
    changes[`${band}EQ` as keyof ChannelConfig] = value;
    onChannelChange(channelId, changes);
  }, [onChannelChange]);

  const handleChannelAuxSendChange = useCallback((channelId: number) => (aux: 1 | 2 | 3 | 4, value: number) => {
    const changes: Partial<ChannelConfig> = {};
    changes[`aux${aux}Send` as keyof ChannelConfig] = value;
    onChannelChange(channelId, changes);
  }, [onChannelChange]);

  const handleChannelVolumeChange = useCallback((channelId: number) => (volume: number) => {
    onChannelChange(channelId, { volume });
  }, [onChannelChange]);

  const handleChannelMuteChange = useCallback((channelId: number) => (muted: boolean) => {
    onChannelChange(channelId, { muted });
  }, [onChannelChange]);

  const handleChannelSoloChange = useCallback((channelId: number) => (solo: boolean) => {
    onChannelChange(channelId, { solo });

    // Update solo mode based on any channels being soloed
    const hasAnySolo = channels.some(ch => ch.id === channelId ? solo : ch.solo);
    setSoloMode(hasAnySolo ? 'solo' : 'off');
  }, [onChannelChange, channels]);

  // Master section event handlers
  const handleMasterVolumeChange = useCallback((volume: number) => {
    onMasterChange({
      mainMix: { ...masterSection.mainMix, volume }
    });
  }, [onMasterChange, masterSection.mainMix]);

  const handleAuxMasterChange = useCallback((auxNumber: 1 | 2 | 3 | 4) => (volume: number) => {
    onMasterChange({
      [`aux${auxNumber}`]: { ...masterSection[`aux${auxNumber}` as keyof MasterSection], volume }
    });
  }, [onMasterChange, masterSection]);

  // Scene management
  const handleSceneLoad = useCallback((sceneId: number) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    // Apply scene to all channels
    scene.channels.forEach((channelChanges, index) => {
      if (channelChanges && channels[index]) {
        onChannelChange(channels[index].id, channelChanges);
      }
    });

    // Apply scene to master section
    if (scene.master) {
      onMasterChange(scene.master);
    }

    onSceneChange?.(sceneId);
  }, [scenes, channels, onChannelChange, onMasterChange, onSceneChange]);

  // Render channel strips
  const renderChannels = () => {
    const stripVariant = variant === 'compact' ? 'minimal' :
                        variant === 'professional' ? 'professional' :
                        variant === 'broadcast' ? 'broadcast' : 'standard';

    return channels.map(channel => (
      <ChannelStrip
        key={channel.id}
        channelNumber={channel.id}
        label={channel.label}
        variant={stripVariant}
        width={channelWidth}

        gain={channel.gain}
        onGainChange={handleChannelGainChange(channel.id)}

        highEQ={channel.highEQ}
        midEQ={channel.midEQ}
        lowEQ={channel.lowEQ}
        onEQChange={handleChannelEQChange(channel.id)}

        aux1Send={channel.aux1Send}
        aux2Send={channel.aux2Send}
        aux3Send={channel.aux3Send}
        aux4Send={channel.aux4Send}
        onAuxSendChange={handleChannelAuxSendChange(channel.id)}

        pan={channel.pan}
        onPanChange={(pan) => onChannelChange(channel.id, { pan })}

        volume={channel.volume}
        onVolumeChange={handleChannelVolumeChange(channel.id)}

        muted={channel.muted}
        onMuteChange={handleChannelMuteChange(channel.id)}

        solo={channel.solo}
        onSoloChange={handleChannelSoloChange(channel.id)}

        armed={channel.armed}
        onArmChange={(armed) => onChannelChange(channel.id, { armed })}

        phantom={channel.phantom}
        onPhantomChange={(phantom) => onChannelChange(channel.id, { phantom })}

        highpass={channel.highpass}
        onHighpassChange={(highpass) => onChannelChange(channel.id, { highpass })}

        signalLevel={channel.signalLevel}
        clipDetected={channel.clipDetected}

        busAssignments={channel.busAssignments}
        onBusAssignmentChange={(bus, assigned) => {
          const newAssignments = assigned
            ? [...channel.busAssignments, bus]
            : channel.busAssignments.filter(b => b !== bus);
          onChannelChange(channel.id, { busAssignments: newAssignments });
        }}
      />
    ));
  };

  // Render master section
  const renderMasterSection = () => {
    if (!showMasterSection) return null;

    return (
      <div className="flex gap-4 border-l-2 border-gray-400 pl-4 ml-4">
        {/* Aux Masters */}
        {showAuxReturns && (
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(auxNum => (
              <div key={auxNum} className="flex flex-col gap-2 items-center">
                <div className="text-xs font-medium text-gray-600">AUX {auxNum}</div>
                <AudioFader
                  value={masterSection[`aux${auxNum}` as keyof MasterSection].volume}
                  onChange={handleAuxMasterChange(auxNum as 1 | 2 | 3 | 4)}
                  min={0}
                  max={100}
                  size="sm"
                  showValue={false}
                  className="min-h-32"
                />
                <AudioButton
                  onClick={() => {
                    const auxKey = `aux${auxNum}` as keyof MasterSection;
                    const auxSection = masterSection[auxKey];
                    onMasterChange({
                      [auxKey]: { ...auxSection, muted: !auxSection.muted }
                    });
                  }}
                  variant="toggle"
                  active={masterSection[`aux${auxNum}` as keyof MasterSection].muted}
                  size="sm"
                >
                  M
                </AudioButton>
              </div>
            ))}
          </div>
        )}

        {/* Main Master */}
        <div className="flex flex-col gap-2 items-center bg-gray-50 dark:bg-gray-800 p-3 rounded">
          <div className="text-sm font-bold text-gray-700 dark:text-gray-300">MAIN MIX</div>

          {/* Headphone monitoring */}
          <div className="flex flex-col gap-1 items-center">
            <div className="text-xs text-gray-600">PHONES</div>
            <AudioKnob
              value={masterSection.headphones.volume}
              onChange={(volume) => onMasterChange({
                headphones: { ...masterSection.headphones, volume }
              })}
              min={0}
              max={100}
              size="sm"
              precision={0}
            />

            <select
              value={masterSection.headphones.source}
              onChange={(e) => onMasterChange({
                headphones: {
                  ...masterSection.headphones,
                  source: e.target.value as 'main' | 'aux1' | 'aux2' | 'aux3' | 'aux4'
                }
              })}
              className="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-1"
            >
              <option value="main">MAIN</option>
              <option value="aux1">AUX1</option>
              <option value="aux2">AUX2</option>
              <option value="aux3">AUX3</option>
              <option value="aux4">AUX4</option>
            </select>
          </div>

          {/* Main volume */}
          <AudioFader
            value={masterSection.mainMix.volume}
            onChange={handleMasterVolumeChange}
            min={0}
            max={100}
            size="md"
            variant="pro"
            showValue={false}
            showScale
            className="min-h-48"
            detentValue={75}
          />

          {/* Main mute */}
          <AudioButton
            onClick={() => onMasterChange({
              mainMix: { ...masterSection.mainMix, muted: !masterSection.mainMix.muted }
            })}
            variant="toggle"
            active={masterSection.mainMix.muted}
            size="md"
            ledColor="red"
          >
            MUTE
          </AudioButton>

          {/* Master level meter */}
          <div className="w-4 h-32 bg-gray-900 rounded border border-gray-600 relative overflow-hidden">
            {/* Calculate main mix level from all unmuted channels */}
            {(() => {
              const activeChannels = channels.filter(ch => !ch.muted && (!soloMode || ch.solo));
              const mainLevel = activeChannels.reduce((sum, ch) => sum + (ch.signalLevel * ch.volume / 100), 0) / Math.max(activeChannels.length, 1);
              const masterLevel = (mainLevel * masterSection.mainMix.volume / 100);

              return (
                <div
                  className={cn(
                    'absolute bottom-0 left-0 right-0 transition-all duration-100',
                    masterLevel > 90 ? 'bg-red-500' :
                    masterLevel > 75 ? 'bg-yellow-500' :
                    'bg-green-500'
                  )}
                  style={{ height: `${Math.min(masterLevel, 100)}%` }}
                />
              );
            })()}
          </div>
        </div>
      </div>
    );
  };

  // Render transport controls
  const renderTransportControls = () => {
    if (variant === 'compact') return null;

    return (
      <div className="flex gap-2 items-center bg-gray-100 dark:bg-gray-800 p-2 rounded">
        <AudioButton
          onClick={() => onRecordingChange?.(!recording)}
          variant="record"
          active={recording}
          size="md"
          shape="round"
        />

        {/* Global solo controls */}
        <div className="flex gap-1 ml-4">
          <AudioButton
            onClick={() => {
              // Clear all solos
              channels.forEach(ch => {
                if (ch.solo) {
                  onChannelChange(ch.id, { solo: false });
                }
              });
              setSoloMode('off');
            }}
            variant="toggle"
            active={soloMode !== 'off'}
            size="sm"
          >
            CLEAR SOLO
          </AudioButton>
        </div>

        {/* Scene controls */}
        {scenes.length > 0 && (
          <div className="flex gap-1 ml-4">
            <select
              value={currentScene || ''}
              onChange={(e) => {
                const sceneId = parseInt(e.target.value);
                if (!isNaN(sceneId)) {
                  handleSceneLoad(sceneId);
                }
              }}
              className="text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
            >
              <option value="">Select Scene</option>
              {scenes.map(scene => (
                <option key={scene.id} value={scene.id}>
                  {scene.name}
                </option>
              ))}
            </select>

            {currentScene && (
              <AudioButton
                onClick={() => onSceneSave?.(currentScene)}
                variant="default"
                size="sm"
              >
                SAVE
              </AudioButton>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      'flex flex-col gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg',
      'overflow-x-auto',
      className
    )}>
      {/* Transport controls */}
      {renderTransportControls()}

      {/* Main mixer area */}
      <div className="flex gap-2 min-h-96">
        {/* Channel strips */}
        <div className="flex gap-2">
          {renderChannels()}
        </div>

        {/* Master section */}
        {renderMasterSection()}
      </div>

      {/* Status info */}
      <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-300 dark:border-gray-600 pt-2">
        <div>
          Channels: {channels.length} |
          Solo: {soloMode} |
          Recording: {recording ? 'ON' : 'OFF'}
        </div>
        {currentScene && (
          <div>Scene: {scenes.find(s => s.id === currentScene)?.name || currentScene}</div>
        )}
      </div>
    </div>
  );
};