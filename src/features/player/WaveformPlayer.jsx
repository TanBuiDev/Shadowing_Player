import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Hover from 'wavesurfer.js/dist/plugins/hover.esm.js';
import { usePlayer } from '@/context/PlayerContext';
import { useFileSystem } from '@/context/FileSystemContext';
import { cn } from '@/lib/utils';

export const WaveformPlayer = React.memo(() => {
    const { audioRef, currentTime, duration, markers, removeMarker, updateMarker, loopRegion } = usePlayer();
    const { currentTrack } = useFileSystem();
    
    const containerRef = useRef(null);
    const wsRef = useRef(null);
    const [zoomLevel, setZoomLevel] = useState(0);
    const [isZooming, setIsZooming] = useState(false);
    
    // Drag state for markers
    const [dragState, setDragState] = useState({ id: null, isDragging: false });
    const pressTimer = useRef(null);
    const [dragTime, setDragTime] = useState(null); // Current time value of the marker being dragged
    
    // Base zoom constants
    const MIN_ZOOM = 0;
    const MAX_ZOOM = 200; // pixels per second

    // Initialize WaveSurfer
    useEffect(() => {
        if (!containerRef.current || !audioRef.current) return;

        // Ensure we only initialize once
        if (wsRef.current) return;

        wsRef.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: '#4b5563', // gray-600
            progressColor: '#8b5cf6', // violet-500 (matches primary)
            cursorColor: 'transparent',
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            height: 60, // Fixed height to match existing progress bar space
            media: audioRef.current, // Sync natively with existing audio element
            minPxPerSec: MIN_ZOOM,
            normalize: true,
            interact: true, // Allow clicking to seek
            plugins: [
                Hover.create({
                    lineColor: '#fbbf24', // amber-500
                    lineWidth: 2,
                    labelBackground: '#000000',
                    labelColor: '#fff',
                    labelSize: '11px',
                }),
            ],
        });

        // Cleanup on unmount
        return () => {
            if (wsRef.current) {
                wsRef.current.destroy();
                wsRef.current = null;
            }
        };
    }, [audioRef]); // Only run once on mount or when audioRef changes

    // Load new audio when track changes
    useEffect(() => {
        if (wsRef.current && currentTrack?.url) {
            // Load audio data into wavesurfer to draw the waveform
            wsRef.current.load(currentTrack.url);
        } else if (wsRef.current && !currentTrack) {
            // Clear wavesurfer if no track
            wsRef.current.empty();
        }
    }, [currentTrack]);

    // Handle Zoom & Scroll (Ctrl + Wheel)
    const handleWheel = useCallback((e) => {
        if (!e.ctrlKey || !wsRef.current) return;
        
        e.preventDefault(); // Prevent page zoom

        setIsZooming(true);
        
        // e.deltaY is positive when scrolling down (zoom out), negative when scrolling up (zoom in)
        const zoomDelta = e.deltaY > 0 ? -10 : 10;
        
        setZoomLevel(prev => {
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + zoomDelta));
            wsRef.current.zoom(newZoom);
            return newZoom;
        });

        // Hide zoom indicator after 1.5s
        setTimeout(() => setIsZooming(false), 1500);
    }, []);

    // Format time helper
    const formatTime = (time) => {
        const val = isFinite(time) ? time : 0;
        const minutes = Math.floor(val / 60);
        const seconds = Math.floor(val % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // --- Drag and Drop Logic for Markers (Long Press) ---
    const handlePointerDown = (e, markerId) => {
        // Prevent default browser dragging behavior on mobile holding
        e.preventDefault();
        e.stopPropagation();
        
        // Start the long press timer
        pressTimer.current = setTimeout(() => {
            // After 300ms, mark it as actively dragging
            const marker = markers.find(m => m.id === markerId);
            setDragState({ id: markerId, isDragging: true });
            setDragTime(marker ? marker.time : 0);
        }, 300);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handlePointerUpOrCancel = (e, marker, isGlobal = false) => {
        if (!isGlobal) {
            e.stopPropagation();
        }
        
        // Clear the timer so a short click doesn't trigger the drag state later
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }

        if (!dragState.isDragging && !isGlobal && marker) {
            // It was a short tap/click! Seek the audio.
            if (audioRef.current) {
                audioRef.current.currentTime = marker.time;
            }
        } else if (dragState.isDragging) {
            // User was dragging and just let go.
            if (dragTime !== null && dragState.id !== null) {
                updateMarker(dragState.id, dragTime);
            }
            // Reset state
            setDragState({ id: null, isDragging: false });
            setDragTime(null);
        }
        
        // If it was a global release, ensure text selection is restored
        if (isGlobal) {
            document.body.style.userSelect = '';
        }
    };

    // Attach global pointer listeners when actively dragging
    useEffect(() => {
        if (!dragState.isDragging) return;

        const handleWindowPointerMove = (e) => {
            if (dragState.id === null || !containerRef.current || !duration) return;
            
            // Disable text selection globally during drag to avoid ugly highlighting
            document.body.style.userSelect = 'none';
            
            // Get limits of the waveform container visibily rendering
            const rect = containerRef.current.getBoundingClientRect();
            
            // Ensure within bounds
            const rawX = Math.max(rect.left, Math.min(e.clientX, rect.right));
            
            // Relative to bounding box
            const localX = rawX - rect.left;

            // Calculate time based on current view/zoom
            const finalX = Math.max(0, Math.min(localX, rect.width));
            let newTime = (finalX / rect.width) * duration;
            
            if (wsRef.current) {
                const wrapper = wsRef.current.getWrapper();
                if (wrapper) {
                   const scrollLeft = wrapper.scrollLeft;
                   const totalWidth = wrapper.scrollWidth;
                   
                   const absolutePx = scrollLeft + finalX;
                   newTime = (absolutePx / totalWidth) * duration;
                }
            }
            
            // Update local visual state only (prevent DB spam)
            setDragTime(newTime);
        };

        const handleWindowPointerUp = (e) => {
            handlePointerUpOrCancel(e, null, true);
        };

        window.addEventListener('pointermove', handleWindowPointerMove);
        window.addEventListener('pointerup', handleWindowPointerUp);
        window.addEventListener('pointercancel', handleWindowPointerUp);

        return () => {
            window.removeEventListener('pointermove', handleWindowPointerMove);
            window.removeEventListener('pointerup', handleWindowPointerUp);
            window.removeEventListener('pointercancel', handleWindowPointerUp);
            document.body.style.userSelect = ''; // safety cleanup
        };
    }, [dragState, duration, handlePointerUpOrCancel]);

    return (
        <div className="space-y-6 px-2 mt-4">
            <div className="flex justify-between text-xs font-bold text-muted-foreground font-mono tracking-widest">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>

            <div className="relative w-full group select-none">
                {/* Waveform Container */}
                <div 
                    className="relative w-full bg-secondary/50 rounded-xl overflow-hidden ring-1 ring-white/5"
                    onWheel={handleWheel}
                >
                    <div ref={containerRef} className="w-full relative z-10" />

                    {/* A-B REPEAT OVERLAY - Placed absolutely over the waveform container */}
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

                {/* ZOOM INDICATOR */}
                {isZooming && (
                    <div className="absolute top-0 right-0 -translate-y-full mb-1 bg-black/80 text-white text-[10px] px-2 py-1 rounded-md border border-white/10 z-30 font-mono transition-opacity">
                        Zoom: {Math.round((zoomLevel / MAX_ZOOM) * 100)}%
                    </div>
                )}

                {/* MARKERS LAYER - Using standard percentage positioning to absolute anchor them */}
                <div className="absolute top-0 inset-x-0 h-full pointer-events-none z-20">
                    {/* The timeline wrapper tracks the scroll of the waveform inside Wavesurfer */}
                    <div className="relative w-full h-full">
                        {markers.map((marker) => {
                            // Calculate percentage position
                            const isBeingDragged = dragState.isDragging && dragState.id === marker.id;
                            const displayTime = isBeingDragged && dragTime !== null ? dragTime : marker.time;
                            const leftPct = Math.max(0, Math.min(100, (displayTime / (duration || 1)) * 100));
                            
                            return (
                                <div
                                    key={marker.id}
                                    className="absolute bottom-full mb-1 w-px group/marker pointer-events-none"
                                    style={{ 
                                        left: `${leftPct}%`,
                                        zIndex: isBeingDragged ? 50 : 20,
                                        transition: isBeingDragged ? 'none' : 'left 0.2s ease-out'
                                    }}
                                >
                                    {/* The Stem (Line down to bar) */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-4 bg-white/50 group-hover/marker:bg-white/80 transition-colors pointer-events-none" />

                                    {/* The Head (Click Target) - Lollipop */}
                                    <button
                                        className={cn(
                                            "absolute bottom-0 -translate-x-1/2 translate-y-1/2 w-12 h-12 flex items-center justify-center pointer-events-auto transition-transform duration-200 focus:outline-none touch-none",
                                            isBeingDragged ? "scale-125 cursor-grabbing" : "hover:scale-110 cursor-pointer"
                                        )}
                                        onPointerDown={(e) => handlePointerDown(e, marker.id)}
                                        onPointerUp={(e) => handlePointerUpOrCancel(e, marker)}
                                        onPointerCancel={(e) => handlePointerUpOrCancel(e, marker)}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            removeMarker(marker.id);
                                        }}
                                        title={`Jump to ${formatTime(marker.time)} (Right-click to delete, Drag to move)`}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.5)] border border-white/20"
                                            style={{ backgroundColor: marker.color }}
                                        />
                                        <div className="absolute bottom-full mb-2 opacity-0 group-hover/marker:opacity-100 transition-opacity bg-black/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                                            {formatTime(displayTime)}
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
});
