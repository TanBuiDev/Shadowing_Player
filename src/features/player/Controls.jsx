import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  FastForward,
  PauseOctagon,
  Volume2,
  MoveRight,
  NotebookPen,
  Captions,
  Settings,
  ChevronRight,
  ChevronLeft,
  Check,
  Keyboard,
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { useFileSystem } from '@/context/FileSystemContext';

export function Controls({ onOpenSettings }) {
  const {
    audioRef,
    isPlaying,
    togglePlayPause,
    currentTime,
    duration,
    playbackSpeed,
    setPlaybackSpeed,
    continuousPlay,
    setContinuousPlay,
    loopCurrent,
    setLoopCurrent,
    autoPause,
    setAutoPause,
    activePanel,
    togglePanel,
  } = usePlayer();

  const { nextTrack, prevTrack } = useFileSystem();

  const [sliderValue, setSliderValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState('main'); // 'main' | 'speed'

  // Sync slider with audio current time when NOT dragging
  useEffect(() => {
    if (!isDragging) {
      setSliderValue(currentTime);
    }
  }, [currentTime, isDragging]);

  const handleSeekChange = (e) => {
    const newVal = parseFloat(e.target.value);
    setSliderValue(newVal);
  };

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekEnd = (e) => {
    setIsDragging(false);
    const newVal = parseFloat(e.target.value);
    if (isFinite(newVal) && audioRef.current) {
      audioRef.current.currentTime = newVal;
    }
  };

  const formatTime = (time) => {
    const val = isFinite(time) ? time : 0;
    const minutes = Math.floor(val / 60);
    const seconds = Math.floor(val % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const toggleMainLoop = () => setLoopCurrent(!loopCurrent);
  const toggleAutoPauseMode = () => {
    setAutoPause(!autoPause);
    if (!autoPause) setContinuousPlay(true);
  };
  const toggleContinuous = () => setContinuousPlay(!continuousPlay);

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto p-6 bg-card/50 backdrop-blur-md border rounded-2xl shadow-xl">
      {/* Smooth Scrubbing Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium text-muted-foreground font-mono">
          <span>{formatTime(sliderValue)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="relative h-12 w-full group select-none">
          {/* Visual Track (Waveform) */}
          <div className="absolute inset-0 bg-secondary/50 rounded-lg overflow-hidden pointer-events-none">
            {/* Mock Wavebars */}
            <div className="absolute inset-0 flex items-center justify-between px-1 opacity-20">
              {Array.from({ length: 60 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-foreground rounded-full transition-[height] duration-500"
                  style={{ height: `${20 + Math.random() * 60}%` }}
                />
              ))}
            </div>
            {/* Progress Fill */}
            <div
              className="absolute top-0 left-0 h-full bg-primary/30 backdrop-blur-sm border-r-2 border-primary transition-none"
              style={{
                width: `${isFinite(duration) && duration > 0 ? (sliderValue / duration) * 100 : 0}%`,
              }}
            />
          </div>

          {/* Interaction Layer (Native Slider) */}
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={sliderValue}
            onInput={handleSeekChange}
            onMouseDown={handleSeekStart}
            onTouchStart={handleSeekStart}
            onMouseUp={handleSeekEnd}
            onTouchEnd={handleSeekEnd}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Playback Modes */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleContinuous}
            className={cn(
              'p-2 rounded-lg transition-all border border-transparent',
              continuousPlay
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
            title="Continuous Play"
          >
            <MoveRight size={18} />
          </button>

          <button
            onClick={toggleMainLoop}
            className={cn(
              'p-2 rounded-lg transition-all border border-transparent',
              loopCurrent
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
            title="Loop Current"
          >
            <Repeat size={18} />
          </button>

          <button
            onClick={toggleAutoPauseMode}
            className={cn(
              'p-2 rounded-lg transition-all border border-transparent',
              autoPause
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
            title="Auto-Pause after file"
          >
            <PauseOctagon size={18} />
          </button>

          <button
            onClick={() => togglePanel('subtitles')}
            className={cn(
              'p-2 rounded-lg transition-all border border-transparent relative',
              activePanel === 'subtitles'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
            title="Subtitle Editor"
          >
            <Captions size={18} />
          </button>

          <button
            onClick={() => togglePanel('notes')}
            className={cn(
              'p-2 rounded-lg transition-all border border-transparent relative',
              activePanel === 'notes'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
            title="Study Notes"
          >
            <NotebookPen size={18} />
          </button>
        </div>

        {/* Main Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={prevTrack}
            className="p-3 text-foreground hover:text-primary transition-colors hover:bg-secondary rounded-full"
          >
            <SkipBack size={24} fill="currentColor" />
          </button>

          <button
            onClick={togglePlayPause}
            className="p-6 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? (
              <Pause size={32} fill="currentColor" />
            ) : (
              <Play size={32} fill="currentColor" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-3 text-foreground hover:text-primary transition-colors hover:bg-secondary rounded-full"
          >
            <SkipForward size={24} fill="currentColor" />
          </button>
        </div>

        {/* Speed Control / Settings Menu */}
        <div className="relative">
          {/* Popover Menu */}
          {isSettingsOpen && (
            <>
              {/* Backdrop to close menu on outside click */}
              <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />

              <div className="absolute bottom-full right-0 mb-3 w-64 bg-neutral-900 border border-neutral-700/50 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                {settingsView === 'main' && (
                  <div className="py-2">
                    <button
                      onClick={() => setSettingsView('speed')}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-200 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Play size={16} className="text-neutral-400" />
                        <span>Playback Speed</span>
                      </div>
                      <div className="flex items-center gap-1 text-neutral-400">
                        <span className="text-xs font-medium">
                          {playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}
                        </span>
                        <ChevronRight size={14} />
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-200 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Keyboard size={16} className="text-neutral-400" />
                        <span>Keyboard Shortcuts</span>
                      </div>
                    </button>
                  </div>
                )}

                {settingsView === 'speed' && (
                  <div className="py-2">
                    <button
                      onClick={() => setSettingsView('main')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-400 hover:text-neutral-200 border-b border-neutral-700/50 mb-1"
                    >
                      <ChevronLeft size={14} />
                      <span>Playback Speed</span>
                    </button>
                    <div className="max-h-60 overflow-y-auto">
                      {[0.25, 0.5, 1.0, 1.5, 2.0].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => {
                            setPlaybackSpeed(speed);
                            setIsSettingsOpen(false);
                            setSettingsView('main');
                          }}
                          className="w-full flex items-center gap-3 px-6 py-2.5 text-sm hover:bg-white/5 transition-colors"
                        >
                          {playbackSpeed === speed ? (
                            <Check size={14} className="text-primary" />
                          ) : (
                            <div className="w-3.5" /> // Spacer
                          )}
                          <span
                            className={cn(
                              playbackSpeed === speed
                                ? 'text-white font-medium'
                                : 'text-neutral-300'
                            )}
                          >
                            {speed === 1 ? 'Normal' : `${speed}x`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Trigger Button */}
          <button
            onClick={() => {
              setIsSettingsOpen(!isSettingsOpen);
              setSettingsView('main');
            }}
            className={cn(
              'p-3 rounded-full transition-all',
              isSettingsOpen
                ? 'bg-primary text-primary-foreground rotate-45'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground hover:rotate-90'
            )}
            title="Playback Settings"
          >
            <Settings size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
