import React, { useState } from 'react';
import { usePlayer } from '@/context/PlayerContext';

import { cn } from '@/lib/utils';

export const ProgressBar = React.memo(() => {
    const { audioRef, currentTime, duration, markers, removeMarker, loopRegion } = usePlayer();

    const [sliderValue, setSliderValue] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

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

    return (
        <div className="space-y-6 px-2 mt-4">
            <div className="flex justify-between text-xs font-bold text-muted-foreground font-mono tracking-widest">
                <span>{formatTime(currentProgress)}</span>
                <span>{formatTime(duration)}</span>
            </div>

            <div className="relative h-12 w-full group select-none">
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
                            width: `${isFinite(duration) && duration > 0 ? (currentProgress / duration) * 100 : 0}%`,
                        }}
                    />

                    {/* A-B REPEAT OVERLAY */}
                    {loopRegion?.start !== null && (
                        <div
                            className={cn(
                                "absolute top-0 bottom-0 bg-amber-500/20 backdrop-blur-sm transition-all pointer-events-none z-10",
                                loopRegion.end === null ? "border-l-2 border-amber-500 animate-[pulse_2s_ease-in-out_infinite]" : "border-x-2 border-amber-500"
                            )}
                            style={{
                                left: `${(loopRegion.start / (duration || 1)) * 100}%`,
                                width: loopRegion.end !== null
                                    ? `${Math.max(0, ((loopRegion.end - loopRegion.start) / (duration || 1)) * 100)}%`
                                    : `calc(100% - ${(loopRegion.start / (duration || 1)) * 100}%)`,
                            }}
                        />
                    )}
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
                            className="absolute bottom-0 -translate-x-1/2 translate-y-1/2 w-12 h-12 flex items-center justify-center pointer-events-auto transition-transform duration-200 hover:scale-110 focus:outline-none"
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
    );
});
