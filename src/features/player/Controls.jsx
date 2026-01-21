import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Repeat,
    PauseOctagon,
    MoveRight,
    NotebookPen,
    Captions,
    Settings,
    ChevronRight,
    ChevronLeft,
    Check,
    Keyboard,
    MapPin,
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { useFileSystem } from '@/context/FileSystemContext';

// Helper Component for Standardized Secondary Buttons
const ControlButton = ({
    icon: Icon,
    onClick,
    active = false,
    title,
    className,
    children,
}) => (
    <button
        onClick={onClick}
        title={title}
        className={cn(
            'group flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 border border-transparent',
            active
                ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_-3px_rgba(var(--primary),0.3)]'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            className
        )}
    >
        {Icon && <Icon size={20} className={cn('transition-transform duration-200', active && 'scale-110')} />}
        {children}
    </button>
);

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
        markers,
        addMarkerAtCurrentTime,
        removeMarker,
    } = usePlayer();

    const { nextTrack, prevTrack } = useFileSystem();

    const [sliderValue, setSliderValue] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsView, setSettingsView] = useState('main'); // 'main' | 'speed'

    // Derived state for slider position
    // If dragging, use local state. If not, sync with audio player time.
    const currentProgress = isDragging ? sliderValue : currentTime;

    const handleSeekChange = (e) => {
        const newVal = parseFloat(e.target.value);
        setSliderValue(newVal);
    };

    const handleSeekStart = () => {
        setSliderValue(currentTime);
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
        <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto p-6 bg-card/60 backdrop-blur-xl border border-border/40 rounded-3xl shadow-2xl">
            {/* Smooth Scrubbing Progress Bar */}
            <div className="space-y-6 px-2 mt-4">
                <div className="flex justify-between text-xs font-bold text-muted-foreground font-mono tracking-widest">
                    <span>{formatTime(currentProgress)}</span>
                    <span>{formatTime(duration)}</span>
                </div>

                <div className="relative h-12 w-full group select-none">
                    {/* Visual Track (Waveform) */}
                    {/* Visual Track (Waveform) */}
                    <div className="absolute inset-0 bg-secondary/50 rounded-xl overflow-hidden pointer-events-none ring-1 ring-white/5">
                        {/* Mock Wavebars */}
                        <div className="absolute inset-0 flex items-center justify-between px-2 opacity-20">
                            {Array.from({ length: 60 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-foreground rounded-full transition-[height] duration-500 will-change-[height]"
                                    style={{ height: `${20 + ((i * 13) % 60)}%` }}
                                />
                            ))}
                        </div>
                        {/* Progress Fill */}
                        <div
                            className="absolute top-0 left-0 h-full bg-primary/30 backdrop-blur-sm border-r-2 border-primary transition-all duration-75 ease-out"
                            style={{
                                width: `${isFinite(duration) && duration > 0 ? (currentProgress / duration) * 100 : 0
                                    }%`,
                            }}
                        />

                    </div>

                    {/* MARKERS LAYER (Above Bar) */}
                    {markers.map((marker) => (
                        <div
                            key={marker.id}
                            className="absolute bottom-full mb-1 w-0.5 z-20 group/marker pointer-events-none"
                            style={{
                                left: `${(marker.time / (duration || 1)) * 100}%`,
                            }}
                        >
                            {/* The Stem (Line down to bar) */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-[1px] h-4 bg-white/50 group-hover/marker:bg-white/80 transition-colors pointer-events-none" />

                            {/* The Head (Click Target) - Lollipop */}
                            <button
                                className="absolute bottom-0 -translate-x-1/2 translate-y-1/2 w-6 h-6 flex items-center justify-center pointer-events-auto transition-transform duration-200 hover:scale-125 focus:outline-none"
                                onClick={(e) => {
                                    e.stopPropagation(); // VITAL: Stop seeking bar
                                    e.preventDefault();
                                    if (audioRef.current) audioRef.current.currentTime = marker.time;
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    removeMarker(marker.id);
                                }}
                                title={`Jump to ${formatTime(marker.time)} (Right-click to delete)`}
                            >
                                {/* Visible Shape */}
                                <div
                                    className="w-3 h-3 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.5)] border border-white/20"
                                    style={{ backgroundColor: marker.color }}
                                />

                                {/* Tooltip on Hover */}
                                <div className="absolute bottom-full mb-2 opacity-0 group-hover/marker:opacity-100 transition-opacity bg-black/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                                    {formatTime(marker.time)}
                                </div>
                            </button>
                        </div>
                    ))}

                    {/* Interaction Layer (Native Slider) */}
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        step="0.01"
                        value={currentProgress}
                        onInput={handleSeekChange}
                        onMouseDown={handleSeekStart}
                        onTouchStart={handleSeekStart}
                        onMouseUp={handleSeekEnd}
                        onTouchEnd={handleSeekEnd}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                </div>
            </div>

            {/* PRIMARY CONTROLS CONTAINER */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 w-full">

                {/* GROUP 1: PLAYBACK LOGIC (Left) */}
                <div className="flex items-center gap-2 md:gap-4">
                    <ControlButton
                        icon={Repeat}
                        title="Loop Current"
                        active={loopCurrent}
                        onClick={toggleMainLoop}
                    />
                    <ControlButton
                        icon={MoveRight}
                        title="Continuous Play"
                        active={continuousPlay}
                        onClick={toggleContinuous}
                    />
                    <ControlButton
                        icon={PauseOctagon}
                        title="Auto-Pause"
                        active={autoPause}
                        onClick={toggleAutoPauseMode}
                    />
                </div>

                {/* GROUP 2: TRANSPORT (Center) */}
                <div className="flex items-center gap-4 md:gap-6 px-4">
                    <ControlButton
                        icon={SkipBack}
                        title="Previous"
                        onClick={prevTrack}
                        className="hover:text-primary hover:bg-primary/5"
                    />

                    <button
                        onClick={togglePlayPause}
                        className="group flex items-center justify-center w-20 h-20 bg-primary text-primary-foreground rounded-full shadow-[0_10px_40px_-10px_rgba(var(--primary),0.5)] hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-300"
                    >
                        {isPlaying ? (
                            <Pause size={36} fill="currentColor" />
                        ) : (
                            <Play size={36} fill="currentColor" className="ml-1" />
                        )}
                    </button>

                    <ControlButton
                        icon={SkipForward}
                        title="Next"
                        onClick={nextTrack}
                        className="hover:text-primary hover:bg-primary/5"
                    />
                </div>

                {/* GROUP 3: FEATURES & SETTINGS (Right) */}
                <div className="flex items-center gap-2 md:gap-4">
                    <ControlButton
                        icon={MapPin}
                        title="Add Marker (Shortcut: P)"
                        onClick={addMarkerAtCurrentTime}
                        className="text-amber-500 hover:bg-amber-500/10 hover:text-amber-600"
                    />
                    <ControlButton
                        icon={Captions}
                        title="Subtitles"
                        active={activePanel === 'subtitles'}
                        onClick={() => togglePanel('subtitles')}
                    />
                    <ControlButton
                        icon={NotebookPen}
                        title="Notes"
                        active={activePanel === 'notes'}
                        onClick={() => togglePanel('notes')}
                    />

                    {/* Settings Dropdown Wrapper */}
                    <div className="relative">
                        <ControlButton
                            icon={Settings}
                            title="Settings"
                            active={isSettingsOpen}
                            onClick={() => {
                                setIsSettingsOpen(!isSettingsOpen);
                                setSettingsView('main');
                            }}
                            className={isSettingsOpen ? "rotate-45 bg-secondary" : "hover:rotate-90"}
                        />

                        {/* Settings Popover */}
                        {isSettingsOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setIsSettingsOpen(false)}
                                />
                                <div className="absolute bottom-full right-1/2 translate-x-1/2 md:right-0 md:translate-x-0 mb-4 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    {settingsView === 'main' && (
                                        <div className="py-2">
                                            <button
                                                onClick={() => setSettingsView('speed')}
                                                className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-secondary/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Play size={16} className="text-muted-foreground" />
                                                    <span>Playback Speed</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-muted-foreground">
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
                                                className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-secondary/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Keyboard size={16} className="text-muted-foreground" />
                                                    <span>Keyboard Shortcuts</span>
                                                </div>
                                            </button>
                                        </div>
                                    )}

                                    {settingsView === 'speed' && (
                                        <div className="py-2">
                                            <button
                                                onClick={() => setSettingsView('main')}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border-b border-border/50 mb-1"
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
                                                        className="w-full flex items-center gap-3 px-6 py-2.5 text-sm hover:bg-secondary/50 transition-colors"
                                                    >
                                                        <div className="w-4 flex items-center justify-center">
                                                            {playbackSpeed === speed && <Check size={14} className="text-primary" />}
                                                        </div>
                                                        <span className={cn(
                                                            playbackSpeed === speed ? "text-foreground font-medium" : "text-muted-foreground"
                                                        )}>
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
                    </div>
                </div>
            </div>
        </div>
    );
}
