import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Upload, Music, Settings, FolderUp, RefreshCw, Mic, Volume2, FileAudio, Trash2 } from 'lucide-react';
import { Controls } from './components/Controls';
import { Playlist } from './components/Playlist';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { NotesPanel } from './components/NotesPanel';
import { SubtitleEditor } from './components/SubtitleEditor';
import { SubtitleOverlay } from './components/SubtitleOverlay';
import { processFilesForPlayer } from './lib/filesystem';
import { ErrorBoundary } from './components/ErrorBoundary';
import { dbService } from './lib/db';
import { cn } from './lib/utils';

function AppContent() {
  const [files, setFiles] = useState([]);
  const [fileTree, setFileTree] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0, filename: '' });

  const [currentFileIndex, setCurrentFileIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  const [continuousPlay, setContinuousPlay] = useState(true);
  const [loopCurrent, setLoopCurrent] = useState(true); // Default loop to true for shadowing usually
  const [autoPause, setAutoPause] = useState(false);
  const [isCCEnabled, setIsCCEnabled] = useState(true);

  // Panels State
  const [activePanel, setActivePanel] = useState(null); // 'notes' | 'subtitles' | null

  // Data State
  const [notes, setNotes] = useState([]);
  const [subtitles, setSubtitles] = useState([]);

  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);

  // Helper for non-blocking loop
  const waitNextFrame = () => new Promise(resolve => setTimeout(resolve, 0));

  // --- Persistence: Load on Mount (Chunked) ---
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Fetch raw data
        const storedFiles = await dbService.getAllFiles();

        if (storedFiles && storedFiles.length > 0) {
          setIsProcessing(true);
          setProgress({ processed: 0, total: storedFiles.length, filename: 'Initializing...' });

          // 2. Process in chunks (Creating ObjectURLs can be expensive en masse)
          const CHUNK_SIZE = 50; // Larger chunk size for simple URL creation
          const preparedFiles = [];

          for (let i = 0; i < storedFiles.length; i += CHUNK_SIZE) {
            const chunk = storedFiles.slice(i, i + CHUNK_SIZE);

            // Process chunk
            const chunkResult = chunk.map(f => ({
              ...f,
              url: URL.createObjectURL(f.file || f.originalFile) // Handle potential DB structure naming
            }));

            preparedFiles.push(...chunkResult);

            // Update UI
            setProgress({
              processed: Math.min(i + CHUNK_SIZE, storedFiles.length),
              total: storedFiles.length,
              filename: chunk[0].name
            });

            await waitNextFrame();
          }

          // 3. Finalize Tree (Synchronous but typically fast enough for sorted lists)
          const { sortedFiles, fileTree: newTree } = processFilesForPlayer(preparedFiles); // Re-sort/treeify

          setFiles(preparedFiles); // Use the prepared ones which have URLs
          setFileTree(newTree);
        }
      } catch (e) {
        console.error("Failed to load files from DB", e);
      } finally {
        setIsLoading(false);
        setIsProcessing(false);
      }
    };
    init();
  }, []);

  // --- Persistence: Clear Logic ---
  const clearPlaylist = async () => {
    // 1. Immediate Audio Stop
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setIsPlaying(false);
    setCurrentFileIndex(null);
    setCurrentTime(0);
    setDuration(0);

    // 2. Revoke URLs
    files.forEach(f => URL.revokeObjectURL(f.url));

    // 3. Reset State
    setFiles([]);
    setFileTree([]);
    setNotes([]);
    setSubtitles([]);
    setActivePanel(null);

    // 4. Clear DB
    await dbService.clearAll();
  };

  // --- Deletion Logic ---
  const extractFileIdsFromNode = (node, idSet = new Set()) => {
    if (node.type === 'file') {
      idSet.add(node.fileData.id);
    } else if (node.children) {
      node.children.forEach(child => extractFileIdsFromNode(child, idSet));
    }
    return idSet;
  };

  const handleDeleteItem = async (node) => {
    // 1. Identify IDs to remove
    const idsToRemove = extractFileIdsFromNode(node);
    if (idsToRemove.size === 0) return;

    // 2. Check if Current Track is being deleted
    const currentTrackId = currentTrack?.id;
    if (currentTrackId && idsToRemove.has(currentTrackId)) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      setIsPlaying(false);
      setCurrentFileIndex(null); // Reset selection
      setCurrentTime(0);
      setNotes([]);
      setSubtitles([]);
    }

    // 3. Update State (Filter out deleted)
    const newFiles = files.filter(f => !idsToRemove.has(f.id));

    // Revoke URLs of deleted
    files.forEach(f => {
      if (idsToRemove.has(f.id)) URL.revokeObjectURL(f.url);
    });

    // Re-treeify
    const { sortedFiles, fileTree: newTree } = processFilesForPlayer(newFiles);
    setFiles(sortedFiles);
    setFileTree(newTree);

    // If we deleted the current track, we already set index to null. 
    // If we deleted files *before* the current track, the index might be wrong now.
    // We need to re-find the current track index if it still exists.
    if (currentTrackId && !idsToRemove.has(currentTrackId)) {
      const newIndex = sortedFiles.findIndex(f => f.id === currentTrackId);
      setCurrentFileIndex(newIndex);
    }

    // 4. Remove from DB (Async)
    try {
      await dbService.deleteFiles(Array.from(idsToRemove));
    } catch (err) {
      console.error("Failed to delete from DB", err);
    }
  };


  // --- File Handling (Chunked) ---
  const handleFiles = async (input, reset = false) => {
    const newFilesList = Array.from(input); // Convert FileList to Array immediately
    if (newFilesList.length === 0) return;

    setIsProcessing(true);
    setProgress({ processed: 0, total: newFilesList.length, filename: 'Starting...' });

    try {
      // 1. Prepare Base List
      let finalFilesFn = [];

      // If NOT resetting, strictly keep ALL existing files first
      if (!reset) {
        finalFilesFn = [...files];
      } else {
        // If resetting, clear old URLs first to avoid leaks
        files.forEach(f => URL.revokeObjectURL(f.url));
        await dbService.clearAll(); // Clear DB if it's a hard reset
      }

      // 2. Chunked Processing of NEW files
      const CHUNK_SIZE = 20;
      const processedNewFiles = [];

      for (let i = 0; i < newFilesList.length; i += CHUNK_SIZE) {
        const chunk = newFilesList.slice(i, i + CHUNK_SIZE);

        // A. Process Chunk (Data Extraction)
        // We use the filesystem lib helper to normalize just this chunk
        const { sortedFiles: normalizedChunk } = processFilesForPlayer(chunk);

        // B. Add to IDB immediately
        const dbItems = normalizedChunk.map(f => ({
          id: f.id,
          name: f.name,
          path: f.path,
          originalFile: f.originalFile
        }));
        await dbService.saveFiles(dbItems);

        // C. Prepare for State (Add URL)
        const readyChunk = normalizedChunk.map(f => ({
          ...f,
          url: URL.createObjectURL(f.originalFile)
        }));

        processedNewFiles.push(...readyChunk);

        // Update Progress
        setProgress({
          processed: Math.min(i + CHUNK_SIZE, newFilesList.length),
          total: newFilesList.length,
          filename: chunk[0].name
        });

        // Yield to Main Thread
        await waitNextFrame();
      }

      // 3. Merge & Deduplicate
      // We merge the *newly processed* ones into the *base* list
      const combined = [...finalFilesFn, ...processedNewFiles];

      const uniqueMap = new Map();
      combined.forEach(f => uniqueMap.set(f.id, f));
      const finalUniqueList = Array.from(uniqueMap.values());

      // 4. Re-calculate Tree (One-shot)
      const { sortedFiles, fileTree: newTree } = processFilesForPlayer(finalUniqueList);

      setFiles(sortedFiles);
      setFileTree(newTree);

    } catch (err) {
      console.error("Error processing files:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const onFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files, false);
    }
    e.target.value = null;
  };

  // --- Audio Logic (Identical to before) ---
  const currentTrack = useMemo(() => {
    if (currentFileIndex !== null && files[currentFileIndex]) {
      return files[currentFileIndex];
    }
    return null;
  }, [currentFileIndex, files]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (currentTrack) {
      if (audio.src !== currentTrack.url) {
        audio.src = currentTrack.url;
        if (isPlaying) audio.play().catch(console.warn);
      }
    } else {
      if (isPlaying) setIsPlaying(false);
    }
  }, [currentTrack]);

  useEffect(() => {
    if (audioRef.current && currentTrack) {
      if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false));
      else audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  const togglePlayPause = () => { if (currentTrack) setIsPlaying(p => !p); };
  const nextTrack = useCallback(() => {
    if (currentFileIndex !== null && currentFileIndex < files.length - 1) setCurrentFileIndex(currentFileIndex + 1);
    else setIsPlaying(false);
  }, [currentFileIndex, files.length]);
  const prevTrack = useCallback(() => {
    if (currentFileIndex !== null && currentFileIndex > 0) setCurrentFileIndex(currentFileIndex - 1);
  }, [currentFileIndex]);

  const onTrackEnded = () => {
    if (loopCurrent) {
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); }
    } else if (autoPause) {
      if (currentFileIndex !== null && currentFileIndex < files.length - 1) {
        setCurrentFileIndex(currentFileIndex + 1);
        setIsPlaying(false);
      } else setIsPlaying(false);
    } else if (continuousPlay) {
      nextTrack();
    } else setIsPlaying(false);
  };

  const playFileFromTree = (fileData) => {
    const idx = files.findIndex(f => f.id === fileData.id);
    if (idx !== -1) { setCurrentFileIndex(idx); setIsPlaying(true); }
  };

  // --- Data Loading Logic ---
  useEffect(() => {
    const loadData = async () => {
      if (!currentTrack) {
        setNotes([]);
        setSubtitles([]);
        return;
      }
      try {
        // Parallel Load
        const [loadedNotes, loadedSubs] = await Promise.all([
          dbService.getNotes(currentTrack.id),
          dbService.getSubtitles(currentTrack.id)
        ]);

        // Ensure sorted
        setNotes(loadedNotes.sort((a, b) => a.timestamp - b.timestamp));
        setSubtitles(loadedSubs);
      } catch (e) {
        console.error("Failed to load data", e);
        setNotes([]);
        setSubtitles([]);
      }
    };
    loadData();
  }, [currentTrack]);

  // --- Notes Actions ---
  const handleAddNote = async (newNote) => {
    setIsPlaying(false); if (audioRef.current) audioRef.current.pause(); // Auto-pause
    const updatedNotes = [...notes, newNote].sort((a, b) => a.timestamp - b.timestamp);
    setNotes(updatedNotes);
    if (currentTrack) await dbService.saveNotes(currentTrack.id, updatedNotes);
  };

  const handleDeleteNote = async (noteId) => {
    const updatedNotes = notes.filter(n => n.id !== noteId);
    setNotes(updatedNotes);
    if (currentTrack) await dbService.saveNotes(currentTrack.id, updatedNotes);
  };

  const handleEditNote = async (noteId, newContent) => {
    const updatedNotes = notes.map(n => n.id === noteId ? { ...n, content: newContent } : n);
    setNotes(updatedNotes);
    if (currentTrack) await dbService.saveNotes(currentTrack.id, updatedNotes);
  };

  // --- Subtitles Actions ---
  const handleSubtitleUpdate = async (newSubtitles) => {
    // Sorting
    const sorted = [...newSubtitles].sort((a, b) => a.start - b.start);
    setSubtitles(sorted);
    if (currentTrack) await dbService.saveSubtitles(currentTrack.id, sorted);
  };

  // --- Panel Management ---
  const togglePanel = (panelName) => {
    const newState = activePanel === panelName ? null : panelName;
    setActivePanel(newState);

    // Auto-pause if opening ANY panel
    if (newState && isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    }
  };

  const handleSeek = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      if (!isPlaying) {
        setIsPlaying(true);
        audioRef.current.play();
      }
    }
  };

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.code) {
        case 'Space': e.preventDefault(); togglePlayPause(); break;
        case 'ArrowLeft': if (audioRef.current) audioRef.current.currentTime -= 5; break;
        case 'ArrowRight': if (audioRef.current) audioRef.current.currentTime += 5; break;
        case 'ArrowUp': e.preventDefault(); prevTrack(); break;
        case 'ArrowDown': e.preventDefault(); nextTrack(); break;
        case 'KeyN': e.preventDefault(); togglePanel('notes'); break;
        case 'KeyS':
          // Toggle Subtitles (CC) - adding this hotkey as a nice-to-have
          // Only if modifier is not pressed? Let's be careful.
          // Actually, user didn't ask for KeyS, they said they want to see subtitles.
          // Im not adding KeyS.
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, prevTrack, nextTrack, activePanel, isPlaying]);


  // Loading State
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-foreground">
        <RefreshCw className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  // UI Handlers
  const onDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) handleFiles(e.dataTransfer.files, false);
  };

  return (
    <div
      className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <ProcessingOverlay isProcessing={isProcessing} progress={progress} />

      {isDragging && (
        <div className="absolute inset-0 bg-primary/20 z-50 flex items-center justify-center backdrop-blur-sm border-4 border-primary border-dashed m-4 rounded-3xl pointer-events-none">
          <div className="text-4xl font-bold text-primary animate-bounce">Drop Audio Here</div>
        </div>
      )}

      {/* Header */}
      <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg text-primary-foreground shadow-lg shadow-primary/20">
            <Mic size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent hidden sm:block">
            Shadowing Player
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" multiple accept="audio/*" className="hidden" ref={fileInputRef} onChange={onFileSelect} />
          <input type="file" accept="audio/*" webkitdirectory="" directory="" multiple className="hidden" ref={folderInputRef} onChange={onFileSelect} />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors border border-border"
          >
            <FileAudio size={16} />
            <span>Files</span>
          </button>

          <button
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <FolderUp size={16} />
            <span>Folder</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-80 border-r border-border bg-card/30 flex flex-col shrink-0 flex-1 h-full min-h-0 transition-all duration-300 ease-in-out">
          <div className="p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm z-10 flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Volume2 size={12} /> Playlist ({files.length})
            </h2>
            {files.length > 0 && (
              <button
                onClick={clearPlaylist}
                className="flex items-center gap-1 text-[10px] text-destructive hover:bg-destructive/10 px-2 py-1 rounded transition-colors uppercase font-bold tracking-wider"
              >
                <Trash2 size={10} /> Clear
              </button>
            )}
          </div>

          <Playlist
            fileTree={fileTree}
            currentFileId={currentTrack?.id}
            onPlay={playFileFromTree}
            onDelete={handleDeleteItem}
            isPlaying={isPlaying}
          />
        </aside>

        {/* MAIN VISUAL AREA */}
        <main className="flex-[2] flex flex-col relative bg-gradient-to-br from-background to-secondary/20 min-w-0">
          <div className="flex-1 flex items-center justify-center p-8 min-h-0 overflow-y-auto">
            {currentTrack ? (
              <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300 w-full max-w-2xl">
                <div className="relative">
                  <div className="w-48 h-48 md:w-64 md:h-64 rounded-3xl bg-gradient-to-tr from-primary to-purple-600 shadow-[0_20px_60px_-10px_rgba(var(--primary),0.4)] mx-auto flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=1000&auto=format&fit=crop')] opacity-30 mix-blend-overlay bg-cover bg-center transition-transform hover:scale-110 duration-700" />

                    {isPlaying ? (
                      <div className="flex items-end gap-1.5 h-16">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="w-2.5 bg-white/90 rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: `${i * 0.1}s`, height: '60%' }} />
                        ))}
                      </div>
                    ) : (
                      <Music size={80} className="text-white/80" />
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold tracking-tight text-foreground truncate drop-shadow-sm px-4">
                    {currentTrack.name.replace(/\.[^/.]+$/, "")}
                  </h2>
                  <p className="text-muted-foreground font-medium flex items-center justify-center gap-2">
                    <FolderUp size={14} />
                    {currentTrack.parentFolder || 'Unsorted'}
                  </p>
                </div>

                {/* POSITION 2: SubtitleOverlay Moved Here */}
                <SubtitleOverlay
                  subtitles={subtitles}
                  currentTime={currentTime}
                  isEnabled={isCCEnabled}
                />

              </div>
            ) : (
              <div className="text-center text-muted-foreground select-none">
                <div className="w-32 h-32 rounded-full bg-secondary/50 mx-auto mb-6 flex items-center justify-center border border-dashed border-border opacity-50">
                  <Upload size={48} />
                </div>
                <h2 className="text-xl font-medium text-foreground">Ready to Practice</h2>
                <p className="mt-2 text-sm">Upload files or folders via the buttons above.</p>
              </div>
            )}
          </div>

          <div className="p-6 pb-8 z-20 bg-background/50 backdrop-blur-xl border-t border-border/50">
            <Controls
              isPlaying={isPlaying}
              onPlayPause={togglePlayPause}
              onPrev={prevTrack}
              onNext={nextTrack}
              onSeekBackward={() => { if (audioRef.current) audioRef.current.currentTime -= 5; }}
              onSeekForward={() => { if (audioRef.current) audioRef.current.currentTime += 5; }}
              playbackSpeed={playbackSpeed}
              setPlaybackSpeed={setPlaybackSpeed}
              loopCurrent={loopCurrent}
              toggleLoopCurrent={() => setLoopCurrent(!loopCurrent)}
              autoPause={autoPause}
              toggleAutoPause={() => {
                setAutoPause(!autoPause);
                if (!autoPause) setContinuousPlay(true);
              }}
              continuousPlay={continuousPlay}
              toggleContinuousPlay={() => setContinuousPlay(!continuousPlay)}
              currentTime={currentTime}
              duration={duration}
              onSeek={(time) => { if (audioRef.current) audioRef.current.currentTime = time; }}

              activePanel={activePanel}
              togglePanel={togglePanel}
            />
          </div>
        </main>

        {/* RIGHT PANEL - DYNAMIC */}
        {activePanel === 'notes' && (
          <aside className="w-80 shrink-0 h-full animate-in slide-in-from-right duration-300 bg-background border-l border-border shadow-xl z-20">
            <NotesPanel
              notes={notes}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
              onEditNote={handleEditNote}
              onSeek={handleSeek}
              currentTime={currentTime}
              currentTrack={currentTrack}
            />
          </aside>
        )}

        {activePanel === 'subtitles' && (
          <aside className="w-80 shrink-0 h-full animate-in slide-in-from-right duration-300 bg-background border-l border-border shadow-xl z-20">
            <SubtitleEditor
              subtitles={subtitles}
              setSubtitles={handleSubtitleUpdate}
              currentTime={currentTime}
              currentTrack={currentTrack}
              onSeek={handleSeek}
            />
          </aside>
        )}

      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={onTrackEnded}
        onError={(e) => { console.error("Audio Error", e); setIsPlaying(false); }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
