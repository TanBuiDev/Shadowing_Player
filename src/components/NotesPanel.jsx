import React, { useState, useRef, useEffect } from 'react';
import { NotebookPen, Plus, Trash2, Clock, Play } from 'lucide-react';
import { cn } from '../lib/utils';

export function NotesPanel({
    notes,
    onAddNote,
    onDeleteNote,
    onSeek,
    currentTime,
    currentTrack
}) {
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef(null);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAdd = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const timestamp = currentTime;
        const newNote = {
            id: crypto.randomUUID(),
            timestamp: timestamp,
            formattedTime: formatTime(timestamp),
            content: inputValue,
            createdAt: new Date().toISOString()
        };

        onAddNote(newNote);
        setInputValue("");
    };

    // Auto-focus input when panel opens or when intending to type
    // (Optional: depends on UX preference, maybe just leave it manually focused)

    if (!currentTrack) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
                <p>Play a track to start taking notes.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-card/30 backdrop-blur-sm border-l border-border relative">
            <div className="p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm flex justify-between items-center shrink-0">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <NotebookPen size={14} /> Study Notes ({notes.length})
                </h2>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-rounded-full">
                {notes.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm mt-10 space-y-2 opacity-70">
                        <NotebookPen size={48} className="mx-auto opacity-50 mb-4" />
                        <p>No notes yet.</p>
                        <p>Click "Add Note" to capture this moment.</p>
                    </div>
                ) : (
                    notes.map((note) => (
                        <div
                            key={note.id}
                            className="bg-card/80 border border-border/50 rounded-lg p-3 hover:border-primary/50 transition-colors group relative shadow-sm"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <button
                                    onClick={() => onSeek(note.timestamp)}
                                    className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded transition-colors"
                                >
                                    <Play size={10} className="fill-current" />
                                    {note.formattedTime}
                                </button>
                                <span className="text-[10px] text-muted-foreground opacity-50">
                                    {new Date(note.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                {note.content}
                            </p>

                            <button
                                onClick={() => onDeleteNote(note.id)}
                                className="absolute bottom-2 right-2 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                title="Delete Note"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background/50 backdrop-blur-xl border-t border-border/50 shrink-0">
                <form onSubmit={handleAdd} className="flex gap-2">
                    <div className="relative flex-1">
                        <div className="absolute left-3 top-2.5 text-xs font-mono text-muted-foreground bg-secondary/50 px-1.5 rounded">
                            {formatTime(currentTime)}
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Type vocabulary or note..."
                            className="w-full bg-secondary/50 border border-border rounded-lg pl-16 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                            autoComplete="off"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!inputValue.trim()}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}
