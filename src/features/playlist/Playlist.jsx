import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  FileAudio,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Play,
  Music,
  Trash2,
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { useFileSystem } from '@/context/FileSystemContext';

const FileTreeNode = ({
  node,
  level,
  currentFileId,
  onPlay,
  onDelete,
  isPlaying,
  expandedPaths,
  toggleFolder,
}) => {
  const isFolder = node.type === 'folder';
  const isExpanded = expandedPaths.has(node.path);

  // Check if this node is the active file
  const isActive = !isFolder && node.fileData.id === currentFileId;

  const paddingLeft = `${level * 16 + 12}px`;

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(node);
  };

  if (isFolder) {
    return (
      <div>
        <div
          onClick={() => toggleFolder(node.path)}
          className="flex items-center justify-between gap-2 py-1.5 pr-2 hover:bg-secondary/50 cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors group"
          style={{ paddingLeft }}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="opacity-70">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
            <span className={cn('text-sky-400/80')}>
              {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
            </span>
            <span className="text-sm font-medium truncate">{node.name}</span>
          </div>

          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
            title="Delete Folder"
          >
            <Trash2 size={12} />
          </button>
        </div>
        {isExpanded && (
          <div>
            {node.children.map((child, i) => (
              <FileTreeNode
                key={child.path + i}
                node={child}
                level={level + 1}
                currentFileId={currentFileId}
                onPlay={onPlay}
                onDelete={onDelete}
                isPlaying={isPlaying}
                expandedPaths={expandedPaths}
                toggleFolder={toggleFolder}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File Node
  return (
    <div
      onClick={() => onPlay(node.fileData)}
      className={cn(
        'group flex items-center justify-between gap-2 py-2 pr-2 cursor-pointer transition-all border-l-2',
        isActive
          ? 'bg-secondary border-primary text-primary'
          : 'border-transparent hover:bg-secondary/30 text-foreground/80 hover:text-foreground'
      )}
      style={{ paddingLeft }}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <div
          className={cn(
            'shrink-0 transition-colors',
            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
          )}
        >
          {isActive && isPlaying ? <Play size={14} fill="currentColor" /> : <Music size={14} />}
        </div>
        <span className="text-sm truncate leading-tight">{node.name}</span>
      </div>

      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-all shrink-0"
        title="Delete File"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
};

export function Playlist() {
  const { isPlaying } = usePlayer();
  const { fileTree, currentTrack, playFileById, handleDeleteItem } = useFileSystem();

  const [expandedPaths, setExpandedPaths] = useState(new Set());
  const currentFileId = currentTrack?.id;

  // Helper Wrappers
  const onPlay = (fileData) => playFileById(fileData.id);
  const onDelete = (node) => handleDeleteItem(node);

  // Function to recursively find path to the active file
  useEffect(() => {
    if (!currentFileId || !fileTree) return;

    const findPath = (nodes, targetId, currentPathChain) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          if (node.fileData.id === targetId) return true;
        } else {
          if (findPath(node.children, targetId, currentPathChain)) {
            currentPathChain.push(node.path);
            return true;
          }
        }
      }
      return false;
    };

    const pathsToExpand = [];
    findPath(fileTree, currentFileId, pathsToExpand);

    if (pathsToExpand.length > 0) {
      // Use requestAnimationFrame to avoid "synchronous setState" linter warning and cascading renders
      requestAnimationFrame(() => {
        setExpandedPaths((prev) => {
          // Check if all paths are already expanded to avoid unnecessary re-renders
          const allExpanded = pathsToExpand.every((p) => prev.has(p));
          if (allExpanded) return prev;

          const next = new Set(prev);
          pathsToExpand.forEach((p) => next.add(p));
          return next;
        });
      });
    }
  }, [currentFileId, fileTree]);

  const toggleFolder = (path) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  if (!fileTree || fileTree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center space-y-4">
        <div className="p-6 rounded-3xl bg-secondary/30 border border-dashed border-border">
          <Folder size={48} className="opacity-50" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">No Files</h3>
          <p className="text-sm max-w-[200px] mx-auto text-muted-foreground mt-2">
            Upload a folder or audio files to generate the playlist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-rounded-full">
      {fileTree.map((node, i) => (
        <FileTreeNode
          key={node.path + i}
          node={node}
          level={0}
          currentFileId={currentFileId}
          onPlay={onPlay}
          onDelete={onDelete}
          isPlaying={isPlaying}
          expandedPaths={expandedPaths}
          toggleFolder={toggleFolder}
        />
      ))}
    </div>
  );
}
