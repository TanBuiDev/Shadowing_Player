import React, { useRef, useEffect } from 'react';
import { Upload, Download, Plus, Trash2, RefreshCw, Captions, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseSRT, parseParsedSubtitlesToSRT } from '@/lib/subtitleParser';
import { usePlayer } from '@/context/PlayerContext';
import { useFileSystem } from '@/context/FileSystemContext';

export function SubtitleEditor() {
    const { currentTime } = usePlayer();
    const { subtitles, updateSubtitles, currentTrack: fsTrack } = useFileSystem();

    // Removed unused seeking helper

    const setSubtitles = updateSubtitles;
    const currentTrack = fsTrack;

    const fileInputRef = useRef(null);
    const activeSubRef = useRef(null);

    // Scroll active subtitle into view
    useEffect(() => {
        if (activeSubRef.current) {
            activeSubRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [subtitles, currentTime]);

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const parsed = parseSRT(evt.target.result);
                setSubtitles(parsed);
            } catch (err) {
                console.error('Failed to parse subtitles', err);
                alert('Invalid subtitle file.');
            }
        };
        reader.readAsText(file);
        e.target.value = null; // Reset
    };

    const handleExport = () => {
        if (subtitles.length === 0) return;
        const srtContent = parseParsedSubtitlesToSRT(subtitles);
        const blob = new Blob([srtContent], { type: 'text/srt' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentTrack?.name || 'subtitles'}.srt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const addSubtitle = () => {
        const start = currentTime;
        const newSub = {
            id: crypto.randomUUID(),
            start: start,
            end: start + 2.0, // Default 2s duration
            text: '',
        };
        // Insert in chronological order
        const newSubs = [...subtitles, newSub].sort((a, b) => a.start - b.start);
        setSubtitles(newSubs);
    };

    const updateSubtitle = (id, field, value) => {
        const newSubs = subtitles.map((s) => {
            if (s.id !== id) return s;
            return { ...s, [field]: value };
        });
        // Resorting might be annoying while typing time, so we avoid resorting here
        // But for consistency we usually resort on extensive edits.
        // For now, let's just update in place.
        setSubtitles(newSubs);
    };

    const deleteSubtitle = (id) => {
        const newSubs = subtitles.filter((s) => s.id !== id);
        setSubtitles(newSubs);
    };

    const formatTimeSimple = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    const parseInputTime = (timeStr) => {
        // MM:SS.ms -> seconds
        const parts = timeStr.split(':');
        if (parts.length < 2) return 0;
        const m = parseInt(parts[0]);
        const s = parseFloat(parts[1]);
        return m * 60 + s;
    };

    // Find active subtitle index
    const activeIndex = subtitles.findIndex((s) => currentTime >= s.start && currentTime <= s.end);

    if (!currentTrack) {
        return <div className="p-8 text-center text-muted-foreground">Select a track first</div>;
    }

    return (
        <div className="flex flex-col h-full bg-card/30 backdrop-blur-sm border-l border-border relative">
            {/* Toolbar */}
            <div className="p-3 border-b border-border/50 bg-card/50 flex justify-between items-center shrink-0 gap-2">
                <div className="flex items-center gap-2">
                    <Captions size={16} className="text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Subtitles
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <input
                        type="file"
                        accept=".srt,.vtt"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImport}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                        title="Import SRT"
                    >
                        <Upload size={14} />
                    </button>
                    <button
                        onClick={handleExport}
                        className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                        title="Export SRT"
                    >
                        <Download size={14} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {subtitles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-4 text-center mt-10">
                        <Captions size={48} className="opacity-20" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium">No subtitles yet</p>
                            <p className="text-xs text-muted-foreground">Import or create new ones</p>
                        </div>
                        <button
                            onClick={addSubtitle}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-bold shadow-md"
                        >
                            <Plus size={16} /> Create Subtitle Track
                        </button>
                    </div>
                ) : (
                    <>
                        {subtitles.map((sub, idx) => {
                            const isActive = idx === activeIndex;
                            return (
                                <div
                                    key={sub.id}
                                    ref={isActive ? activeSubRef : null}
                                    className={cn(
                                        'p-3 rounded-lg border transition-all text-sm group relative',
                                        isActive
                                            ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/20'
                                            : 'bg-card/50 border-border/50 hover:border-primary/30'
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground bg-secondary/50 rounded px-1.5 py-0.5">
                                            <Clock size={10} />
                                            <input
                                                className="w-16 bg-transparent border-none focus:outline-none text-center"
                                                defaultValue={formatTimeSimple(sub.start)}
                                                onBlur={(e) =>
                                                    updateSubtitle(sub.id, 'start', parseInputTime(e.target.value))
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.target.blur();
                                                        updateSubtitle(sub.id, 'start', parseInputTime(e.target.value));
                                                    }
                                                }}
                                            />
                                            <span>-</span>
                                            <input
                                                className="w-16 bg-transparent border-none focus:outline-none text-center"
                                                defaultValue={formatTimeSimple(sub.end)}
                                                onBlur={(e) =>
                                                    updateSubtitle(sub.id, 'end', parseInputTime(e.target.value))
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.target.blur();
                                                        updateSubtitle(sub.id, 'end', parseInputTime(e.target.value));
                                                    }
                                                }}
                                            />
                                        </div>

                                        <button
                                            onClick={() => updateSubtitle(sub.id, 'start', currentTime)}
                                            className="p-1 hover:bg-primary/20 rounded text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Sync Start to Current Time"
                                        >
                                            <RefreshCw size={10} />
                                        </button>

                                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => deleteSubtitle(sub.id)}
                                                className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    <textarea
                                        value={sub.text}
                                        onChange={(e) => updateSubtitle(sub.id, 'text', e.target.value)}
                                        className="w-full bg-transparent resize-y min-h-[40px] focus:outline-none text-foreground/90 placeholder:text-muted-foreground/30 leading-relaxed"
                                        placeholder="Caption text..."
                                    />
                                </div>
                            );
                        })}

                        <button
                            onClick={addSubtitle}
                            className="w-full py-2 border border-dashed border-border rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:border-primary/50 transition-colors text-xs uppercase font-bold tracking-widest flex items-center justify-center gap-2"
                        >
                            <Plus size={14} /> Add Caption
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
