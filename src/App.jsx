import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Upload, Music, Settings, FolderUp, RefreshCw, Mic, Volume2, FileAudio, Trash2 } from 'lucide-react';
import { Controls } from './components/Controls';
import { Playlist } from './components/Playlist';
import { processFilesForPlayer } from './lib/filesystem';
import { ErrorBoundary } from './components/ErrorBoundary';
import { dbService } from './lib/db';
import { cn } from './lib/utils';

function AppContent() {
  const [files, setFiles] = useState([]);
  const [fileTree, setFileTree] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentFileIndex, setCurrentFileIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  const [continuousPlay, setContinuousPlay] = useState(true);
  const [loopCurrent, setLoopCurrent] = useState(false);
  const [autoPause, setAutoPause] = useState(false);

  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);

  // --- Persistence: Load on Mount ---
  useEffect(() => {
    const init = async () => {
      try {
        const storedFiles = await dbService.getAllFiles();
        if (storedFiles && storedFiles.length > 0) {
          // Reconstruct state
          const { sortedFiles, fileTree: newTree } = processFilesForPlayer(storedFiles);
          const preparedFiles = sortedFiles.map(f => ({
            ...f,
            url: URL.createObjectURL(f.originalFile)
          }));

          setFiles(preparedFiles);
          setFileTree(newTree);
        }
      } catch (e) {
        console.error("Failed to load files from DB", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // --- Persistence: Clear Logic ---
  const clearPlaylist = async () => {
    setIsPlaying(false);
    // Revoke URLs
    files.forEach(f => URL.revokeObjectURL(f.url));

    // Reset State
    setFiles([]);
    setFileTree([]);
    setCurrentFileIndex(null);
    setCurrentTime(0);
    setDuration(0);

    // Clear DB
    await dbService.clearAll();
  };

  // --- File Handling ---
  const handleFiles = async (newFilesList, reset = false) => {
    // 1. Gather files to process
    let allRawFiles = [];
    if (!reset) {
      // Use existing original files from state
      // (Note: persistence requires us to have access to the Blob, which we kept in 'originalFile')
      allRawFiles = files.map(f => ({
        originalFile: f.originalFile,
        path: f.path,
        name: f.name,
        id: f.id
      }));
    }

    // Normalize new items
    const normalizedNew = processFilesForPlayer(newFilesList).sortedFiles;

    // Combine
    allRawFiles = [...allRawFiles, ...normalizedNew];

    // Deduplicate
    const uniqueMap = new Map();
    allRawFiles.forEach(f => {
      const key = f.id; // ID is path-size-timestamp based
      uniqueMap.set(key, f);
    });
    const finalRawList = Array.from(uniqueMap.values());

    // 2. Persist to DB (Async but don't block UI entirely if possible, though safest to await)
    await dbService.saveFiles(finalRawList);

    // 3. Update State (Re-process to ensure correct sort/tree with combined data)
    const { sortedFiles, fileTree: newTree } = processFilesForPlayer(finalRawList);

    // Reuse URLs if possible
    const existingUrlMap = new Map();
    files.forEach(f => existingUrlMap.set(f.id, f.url));

    const preparedFiles = sortedFiles.map(f => {
      const url = existingUrlMap.get(f.id) || URL.createObjectURL(f.originalFile);
      return { ...f, url };
    });

    setFiles(preparedFiles);
    setFileTree(newTree);

    // If we added files and nothing was playing/selected, maybe select?
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

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.code) {
        case 'Space': e.preventDefault(); togglePlayPause(); break;
        case 'ArrowLeft': if (audioRef.current) audioRef.current.currentTime -= 5; break;
        case 'ArrowRight': if (audioRef.current) audioRef.current.currentTime += 5; break;
        case 'ArrowUp': e.preventDefault(); prevTrack(); break;
        case 'ArrowDown': e.preventDefault(); nextTrack(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, prevTrack, nextTrack]);


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
        <aside className="w-80 border-r border-border bg-card/30 flex flex-col shrink-0 flex-1 h-full min-h-0">
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
            isPlaying={isPlaying}
          />
        </aside>

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
            />
          </div>
        </main>
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
