import React, { useState, useMemo, useRef } from 'react';
import { Menu, X, Mic, FolderUp, FileAudio, Upload, Volume2, Music, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Controls,
  Playlist,
  NotesPanel,
  SubtitleEditor,
  SubtitleOverlay,
  SettingsModal,
} from '@/features';
import { ProcessingOverlay } from '@/components';
import { useSettings, useFileSystem, usePlayer } from '@/context';
import { useHotkeys } from '@/hooks/useHotkeys';

export function MainLayout() {
  const { files, handleFiles, currentTrack, clearPlaylist, isProcessing, progress, isLoading } =
    useFileSystem();

  const {
    isPlaying,
    togglePlayPause,
    setIsPlaying,
    activePanel,
    togglePanel,
    isSidebarOpen,
    setIsSidebarOpen,
    audioRef,
    addMarkerAtCurrentTime,
  } = usePlayer();

  const { settings, saveSettings } = useSettings();

  // Local UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // File Inputs Refs
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // --- Hotkeys ---
  const handleHotkeys = useMemo(
    () => ({
      playPause: () => {
        togglePlayPause();
      },
      replay: () => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(console.warn);
          setIsPlaying(true);
        }
      },
      seekBack: () => {
        if (audioRef.current) audioRef.current.currentTime -= 3;
      },
      seekForward: () => {
        if (audioRef.current) audioRef.current.currentTime += 3;
      },
      toggleRecord: () => {
        console.log('Toggle Record triggered (placeholder)');
      },
      addMarker: () => {
        addMarkerAtCurrentTime();
      },
    }),
    [togglePlayPause, audioRef, setIsPlaying, addMarkerAtCurrentTime]
  );

  useHotkeys(settings.keyMap, handleHotkeys);

  // Drag & Drop
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) handleFiles(e.dataTransfer.files, false);
  };

  const onFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files, false);
    }
    e.target.value = null;
  };

  // Initial Loading State
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading Library...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <ProcessingOverlay isProcessing={isProcessing} progress={progress} />
      <SettingsModal
        key={isSettingsOpen ? 'open' : 'closed'}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={saveSettings}
      />

      {isDragging && (
        <div className="absolute inset-0 bg-primary/20 z-50 flex items-center justify-center backdrop-blur-sm border-4 border-primary border-dashed m-4 rounded-3xl pointer-events-none">
          <div className="text-2xl md:text-4xl font-bold text-primary animate-bounce">
            Drop Audio Here
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-14 md:h-16 border-b border-border flex items-center justify-between px-3 md:px-6 bg-card/50 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 text-foreground hover:bg-secondary rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div className="p-2 bg-primary rounded-lg text-primary-foreground shadow-lg shadow-primary/20">
            <Mic size={18} className="md:w-5 md:h-5" />
          </div>
          <h1 className="text-base md:text-xl font-bold tracking-tight bg-linear-to-r from-primary to-purple-400 bg-clip-text text-transparent hidden sm:block">
            Shadowing Player
          </h1>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <input
            type="file"
            multiple
            accept="audio/*"
            className="hidden"
            ref={fileInputRef}
            onChange={onFileSelect}
          />
          <input
            type="file"
            accept="audio/*"
            webkitdirectory=""
            directory=""
            multiple
            className="hidden"
            ref={folderInputRef}
            onChange={onFileSelect}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1 md:gap-2 w-9 h-9 md:w-auto md:px-3 md:py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-xs md:text-sm font-medium transition-colors border border-border"
            title="Open Files"
          >
            <FileAudio size={16} className="md:w-4 md:h-4" />
            <span className="hidden sm:inline">Files</span>
          </button>

          <button
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center justify-center gap-1 md:gap-2 w-9 h-9 md:w-auto md:px-3 md:py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs md:text-sm font-medium transition-colors shadow-sm"
            title="Open Folder"
          >
            <FolderUp size={16} className="md:w-4 md:h-4" />
            <span className="hidden sm:inline">Folder</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* MOBILE SIDEBAR OVERLAY */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR - Playlist */}
        <aside
          className={cn(
            'w-72 md:w-80 border-r border-border bg-card/30 flex flex-col shrink-0 h-full min-h-0 transition-transform duration-300 ease-in-out z-50',
            'fixed md:relative inset-y-0 left-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          )}
        >
          <div className="p-3 md:p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm z-10 flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Volume2 size={12} /> Playlist ({files.length})
            </h2>
            <div className="flex items-center gap-2">
              {files.length > 0 && (
                <button
                  onClick={clearPlaylist}
                  className="flex items-center gap-1 text-[10px] text-destructive hover:bg-destructive/10 px-2 py-1 rounded transition-colors uppercase font-bold tracking-wider"
                >
                  <Trash2 size={10} /> Clear
                </button>
              )}
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden p-1 text-muted-foreground hover:bg-secondary rounded transition-colors"
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <Playlist />
        </aside>

        {/* MAIN VISUAL AREA */}
        <main className="flex-1 flex flex-col relative bg-linear-to-br from-background to-secondary/20 min-w-0 w-full">
          <div className="flex-1 flex items-center justify-center p-4 md:p-8 min-h-0 overflow-y-auto">
            {currentTrack ? (
              <div className="text-center space-y-4 md:space-y-6 animate-in fade-in zoom-in duration-300 w-full max-w-2xl">
                <div className="relative">
                  <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-3xl bg-linear-to-tr from-primary to-purple-600 shadow-[0_20px_60px_-10px_rgba(var(--primary),0.4)] mx-auto flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=1000&auto=format&fit=crop')] opacity-30 mix-blend-overlay bg-cover bg-center transition-transform hover:scale-110 duration-700" />
                    {isPlaying ? (
                      <div className="flex items-end gap-1 md:gap-1.5 h-12 md:h-16">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="w-2 md:w-2.5 bg-white/90 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.1}s`, height: '60%' }}
                          />
                        ))}
                      </div>
                    ) : (
                      <Music size={60} className="md:w-20 md:h-20 text-white/80" />
                    )}
                  </div>
                </div>
                <div className="space-y-1 px-4">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground wrap-break-word drop-shadow-sm">
                    {currentTrack.name.replace(/\.[^/.]+$/, '')}
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground font-medium flex items-center justify-center gap-2">
                    <FolderUp size={12} className="md:w-3.5 md:h-3.5" />
                    <span className="break-all">{currentTrack.parentFolder || 'Unsorted'}</span>
                  </p>
                </div>

                <SubtitleOverlay />
              </div>
            ) : (
              <div
                className="text-center select-none px-4 max-w-sm mx-auto flex flex-col items-center justify-center cursor-pointer group rounded-3xl border-2 border-dashed border-border/50 hover:border-primary/50 hover:bg-secondary/20 p-12 transition-all duration-300"
                onClick={() => folderInputRef.current?.click()}
              >
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-secondary/30 mx-auto mb-6 flex items-center justify-center border border-dashed border-border/50 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors duration-300">
                  <Upload size={40} className="md:w-16 md:h-16" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                  Ready to Practice
                </h2>
                <p className="mt-3 text-sm md:text-base text-muted-foreground">
                  Drag and drop a folder here, or click to <span className="text-primary font-medium">browse files</span>.
                </p>
              </div>
            )}
          </div>

          <div className="p-3 md:p-6 pb-4 md:pb-8 z-20 bg-background/50 backdrop-blur-xl border-t border-border/50">
            <Controls onOpenSettings={() => setIsSettingsOpen(true)} />
          </div>
        </main>

        {/* RIGHT PANEL - DYNAMIC (Responsive Drawer) */}
        {activePanel && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200"
              onClick={() => togglePanel(activePanel)}
            />
            <aside
              className={cn(
                'flex flex-col bg-background border-l border-border shadow-xl z-50 transition-all duration-300 ease-in-out h-full',
                'fixed inset-y-0 right-0 w-80 animate-in slide-in-from-right',
                'md:relative md:w-96 md:translate-x-0 md:shadow-none'
              )}
            >
              {activePanel === 'notes' && <NotesPanel />}
              {activePanel === 'subtitles' && <SubtitleEditor />}
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
