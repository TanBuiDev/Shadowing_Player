import React, { useRef, useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { Play, Pause, SkipBack, SkipForward, Repeat, FastForward, PauseOctagon, Volume2, MoveRight } from 'lucide-react';

export function Controls({
    isPlaying,
    onPlayPause,
    onPrev,
    onNext,
    onSeekBackward,
    onSeekForward, // Optional, can use prev/next if strictly per requirements
    playbackSpeed,
    setPlaybackSpeed,
    loopCurrent,
    toggleLoopCurrent,
    autoPause,
    toggleAutoPause,
    continuousPlay,
    toggleContinuousPlay,
    currentTime,
    duration,
    onSeek
}) {
    const [sliderValue, setSliderValue] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

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
        if (isFinite(newVal)) onSeek(newVal);
    };

    const formatTime = (time) => {
        const val = isFinite(time) ? time : 0;
        const minutes = Math.floor(val / 60);
        const seconds = Math.floor(val % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto p-6 bg-card/50 backdrop-blur-md border rounded-2xl shadow-xl">
            {/* Smooth Scrubbing Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-muted-foreground font-mono">
                    <span>{formatTime(sliderValue)}</span>
                    <span>{formatTime(duration)}</span>
                </div>

                <div className="relative h-12 w-full group select-none">
                    {/* 1. Visual Track (Waveform) */}
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
                            style={{ width: `${(isFinite(duration) && duration > 0) ? (sliderValue / duration) * 100 : 0}%` }}
                        />
                    </div>

                    {/* 2. Interaction Layer (Native Slider) */}
                    {/* We overlay an invisible range input to handle all drag logic natively and perfectly */}
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
                        onClick={toggleContinuousPlay}
                        className={cn(
                            "p-2 rounded-lg transition-all border border-transparent",
                            continuousPlay
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                        title="Continuous Play"
                    >
                        <MoveRight size={18} />
                    </button>

                    <button
                        onClick={toggleLoopCurrent}
                        className={cn(
                            "p-2 rounded-lg transition-all border border-transparent",
                            loopCurrent
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                        title="Loop Current"
                    >
                        <Repeat size={18} />
                    </button>

                    <button
                        onClick={toggleAutoPause}
                        className={cn(
                            "p-2 rounded-lg transition-all border border-transparent",
                            autoPause
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                        title="Auto-Pause after file"
                    >
                        <PauseOctagon size={18} />
                    </button>
                </div>

                {/* Main Controls */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onPrev}
                        className="p-3 text-foreground hover:text-primary transition-colors hover:bg-secondary rounded-full"
                    >
                        <SkipBack size={24} fill="currentColor" />
                    </button>

                    <button
                        onClick={onPlayPause}
                        className="p-6 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                    >
                        {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                    </button>

                    <button
                        onClick={onNext}
                        className="p-3 text-foreground hover:text-primary transition-colors hover:bg-secondary rounded-full"
                    >
                        <SkipForward size={24} fill="currentColor" />
                    </button>
                </div>

                {/* Speed Control */}
                <div className="flex items-center gap-3 min-w-[140px]">
                    <FastForward size={16} className="text-muted-foreground" />
                    <div className="flex flex-col w-full gap-1">
                        <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={playbackSpeed}
                            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                            className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                            <span>0.5x</span>
                            <span className="text-primary font-bold">{playbackSpeed.toFixed(1)}x</span>
                            <span>2.0x</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
