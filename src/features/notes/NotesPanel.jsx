import React, { useState, useRef, useEffect } from 'react';
import { NotebookPen, Plus, Trash2, Clock, Play, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayer } from '@/context/PlayerContext';
import { useFileSystem } from '@/context/FileSystemContext';

// Helper Component for Auto-Resizing Textarea
const AutoResizeTextarea = React.forwardRef(({ value, onChange, className, ...props }, ref) => {
  const textareaRef = useRef(null);
  const combinedRef = (node) => {
    textareaRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height
      textarea.style.height = `${textarea.scrollHeight}px`; // Set to scrollHeight
    }
  }, [value]);

  return (
    <textarea
      ref={combinedRef}
      value={value}
      onChange={onChange}
      className={cn('overflow-hidden resize-none', className)}
      rows={1}
      {...props}
    />
  );
});
AutoResizeTextarea.displayName = 'AutoResizeTextarea';

export function NotesPanel() {
  const {
    currentTime,
    // We might need onSeek from Player? Player has currentTime but can we seek?
    // PlayerContext exposes audioRef, we can implement seek logic or add seek helper.
    // Let's use audioRef from PlayerContext to seek.
    audioRef,
  } = usePlayer();

  const { notes, addNote, deleteNote, editNote, currentTrack } = useFileSystem();

  const onSeek = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const [inputValue, setInputValue] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editValue, setEditValue] = useState('');
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
      createdAt: new Date().toISOString(),
    };

    addNote(newNote);
    setInputValue('');
  };

  const startEditing = (note) => {
    setEditingNoteId(note.id);
    setEditValue(note.content);
  };

  const saveEdit = (noteId) => {
    if (!editValue.trim()) return;
    editNote(noteId, editValue);
    setEditingNoteId(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditValue('');
  };

  // Auto-focus input when panel opens or when intending to type
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
              className={cn(
                'bg-card/80 border border-border/50 rounded-lg p-3 transition-all relative shadow-sm group',
                editingNoteId === note.id ? 'ring-1 ring-primary/50' : 'hover:border-primary/50'
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <button
                  onClick={() => onSeek(note.timestamp)}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary-foreground bg-primary/80 hover:bg-primary px-2.5 py-1 rounded-full shadow-sm shadow-primary/30 transition-all hover:scale-105 active:scale-95"
                  title="Play from this timestamp"
                >
                  <Play size={10} className="fill-current" />
                  {note.formattedTime}
                </button>
                <span className="text-[10px] text-muted-foreground opacity-50">
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>
              </div>

              {editingNoteId === note.id ? (
                <div className="space-y-2">
                  <AutoResizeTextarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[60px] max-h-[300px]"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded"
                      title="Cancel"
                    >
                      <X size={14} />
                    </button>
                    <button
                      onClick={() => saveEdit(note.id)}
                      className="p-1 text-primary hover:bg-primary/10 rounded"
                      title="Save"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed pr-8">
                    {note.content}
                  </p>

                  <div className="absolute bottom-6 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => startEditing(note)}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                      title="Edit Note"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>

                  <div className="absolute bottom-1 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/50 backdrop-blur-xl border-t border-border/50 shrink-0">
        <form onSubmit={handleAdd} className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-1 mb-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary-foreground bg-primary/80 px-2 py-0.5 rounded-full shadow-sm shadow-primary/20" title="Notes will be saved at this time">
              <Clock size={10} />
              {formatTime(currentTime)}
            </div>
          </div>
          <div className="relative flex gap-2">
            <AutoResizeTextarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAdd(e);
                }
              }}
              placeholder="Type vocabulary or note..."
              className="flex-1 bg-secondary/50 border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50 min-h-[50px] max-h-[200px]"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="self-end bg-primary text-primary-foreground hover:bg-primary/90 p-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              title="Add Note (Enter)"
            >
              <Plus size={20} />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center opacity-50">
            Shift + Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
