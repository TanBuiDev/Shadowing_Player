import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useFileSystem } from '@/context/FileSystemContext';
import { useSettings } from '@/context/SettingsContext';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const { currentTrack, nextTrack, prevTrack } = useFileSystem();
  const { settings } = useSettings();

  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // UI Panels
  const [activePanel, setActivePanel] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const togglePanel = (panelName) => {
    setActivePanel((prev) => (prev === panelName ? null : panelName));
  };

  // Playback Modes
  const [continuousPlay, setContinuousPlay] = useState(true);
  const [loopCurrent, setLoopCurrent] = useState(false); // Default false according to user preference maybe? Original code had different defaults. Let's sync with original app defaults if known, or safe defaults.
  const [autoPause, setAutoPause] = useState(false);

  // Track replay counts for Auto-Replay
  const replayCountRef = useRef(0);

  // Sync Audio with Current Track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentTrack) {
      if (audio.src !== currentTrack.url) {
        audio.src = currentTrack.url;
        replayCountRef.current = 0; // Reset replay count
        if (isPlaying) audio.play().catch(console.warn);
      }
    } else {
      // No track
      if (isPlaying) setIsPlaying(false);
      audio.pause();
      audio.src = '';
    }
  }, [currentTrack]); // isPlaying excluded to avoid re-triggering src change on play toggle

  // Sync Playback Speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Handle Play/Pause State
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      if (isPlaying) {
        audioRef.current.play().catch((e) => {
          console.warn('Play interrupted', e);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  const togglePlayPause = () => {
    if (currentTrack) setIsPlaying((p) => !p);
  };

  const onTrackEnded = () => {
    // Auto-Replay Logic
    const { count, interval } = settings.autoReplay;
    if (count > 0 && replayCountRef.current < count) {
      replayCountRef.current++;
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(console.warn);
          setIsPlaying(true);
        }
      }, interval * 1000);
      return;
    }

    if (loopCurrent) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (autoPause) {
      // Go to next but pause
      if (nextTrack()) {
        setIsPlaying(false);
      } else {
        setIsPlaying(false);
      }
    } else if (continuousPlay) {
      if (!nextTrack()) {
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(false);
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        audioRef,
        isPlaying,
        setIsPlaying,
        togglePlayPause,
        currentTime,
        setCurrentTime,
        duration,
        setDuration,
        playbackSpeed,
        setPlaybackSpeed,
        continuousPlay,
        setContinuousPlay,
        loopCurrent,
        setLoopCurrent,
        autoPause,
        setAutoPause,
        onTrackEnded,
        activePanel,
        togglePanel,
        isSidebarOpen,
        setIsSidebarOpen,
      }}
    >
      {children}
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={onTrackEnded}
        onError={(e) => {
          console.error('Audio Error', e);
          setIsPlaying(false);
        }}
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
