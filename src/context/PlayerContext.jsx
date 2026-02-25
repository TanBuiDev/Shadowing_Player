/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useFileSystem } from '@/context/FileSystemContext';
import { useSettings } from '@/context/SettingsContext';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const { currentTrack, nextTrack, markers, addMarker, deleteMarker } = useFileSystem();
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
  const [loopCurrent, setLoopCurrent] = useState(false);
  const [autoPause, setAutoPause] = useState(false);

  // A-B Repeat
  const [loopRegion, setLoopRegion] = useState({ start: null, end: null });

  const toggleABRepeat = () => {
    setLoopRegion((prev) => {
      // 1. If completely off, set A
      if (prev.start === null) return { start: currentTime, end: null };
      
      // 2. If A is set but B is not, set B
      if (prev.start !== null && prev.end === null) {
        // Ensure B > A. If they clicked B earlier than A, swap them.
        if (currentTime <= prev.start) {
          return { start: currentTime, end: prev.start };
        }
        return { start: prev.start, end: currentTime };
      }

      // 3. If both are set, clear them
      return { start: null, end: null };
    });
  };

  // Track replay counts for Auto-Replay
  const replayCountRef = useRef(0);

  // Reset A-B Repeat when track changes
  const prevTrackRef = useRef(null);
  if (currentTrack?.id !== prevTrackRef.current) {
    prevTrackRef.current = currentTrack?.id;
    setLoopRegion({ start: null, end: null });
  }

  // Sync Audio with Current Track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentTrack) {
      if (audio.src !== currentTrack.url) {
        audio.src = currentTrack.url;
        replayCountRef.current = 0; // Reset replay count
        
        // Auto-play the new track
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch((e) => {
          console.warn('Auto-play prevented by browser policy:', e);
          setIsPlaying(false);
        });
      }
    } else {
      // No track
      audio.pause();
      audio.removeAttribute('src');
      audio.load(); // Forces the element to update its state
      // We rely on onPause to update state
    }
  }, [currentTrack, isPlaying]);

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

  const addMarkerAtCurrentTime = () => {
    if (!currentTrack) return;
    const newMarker = {
      id: crypto.randomUUID(),
      time: currentTime,
      label: 'Marker',
      color: '#fbbf24', // Default Amber
    };
    addMarker(newMarker);
  };

  const removeMarker = (id) => {
    deleteMarker(id);
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
        // Markers
        markers,
        addMarkerAtCurrentTime,
        removeMarker,
        // A-B Repeat
        loopRegion,
        toggleABRepeat,
      }}
    >
      {children}
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => {
          const t = e.target.currentTime;
          setCurrentTime(t);
          
          // Enforce A-B loop
          if (loopRegion.start !== null && loopRegion.end !== null) {
            if (t >= loopRegion.end) {
              e.target.currentTime = loopRegion.start;
            }
          }
        }}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={onTrackEnded}
        onError={(e) => {
          // Ignore errors when src is empty (cleanup phase)
          if (!audioRef.current?.getAttribute('src')) return;

          const err = e.target.error;
          // Ignore MEDIA_ELEMENT_ERROR: Empty src attribute (Code 4) if caused by reset
          if (err?.code === 4 && (!audioRef.current.src || audioRef.current.src === window.location.href)) return;

          console.error('Audio Error:', err?.code, err?.message);
          setIsPlaying(false);
        }}
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
