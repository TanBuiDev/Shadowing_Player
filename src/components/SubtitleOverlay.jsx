import React, { useMemo } from 'react';

export function SubtitleOverlay({ subtitles, currentTime, isEnabled = true }) {
    // Render nothing if disabled, but maintain layout space? 
    // The requirement asks to 'Prevent Layout Shift' by wrapping subtitle text in a fixed min-height container.
    // So we should ALWAYS return the container div, even if empty/disabled.

    // Logic to find active sub
    const activeSubtitle = useMemo(() => {
        if (!isEnabled || !subtitles || subtitles.length === 0) return null;
        return subtitles.find(sub => currentTime >= sub.start && currentTime <= sub.end);
    }, [isEnabled, subtitles, currentTime]);

    return (
        <div className="w-full max-w-3xl mx-auto mt-8 mb-4 min-h-[80px] flex items-center justify-center text-center px-4 pointer-events-none">
            {activeSubtitle ? (
                <div className="bg-black/40 backdrop-blur-md text-white/90 px-6 py-3 rounded-2xl text-lg md:text-xl font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300 leading-normal">
                    {activeSubtitle.text}
                </div>
            ) : null}
        </div>
    );
}
