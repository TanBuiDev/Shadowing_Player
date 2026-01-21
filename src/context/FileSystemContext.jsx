/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { dbService } from '@/lib/db';
import { processFilesForPlayer } from '@/lib/filesystem';

const FileSystemContext = createContext(null);

export function FileSystemProvider({ children }) {
    const [files, setFiles] = useState([]);
    const [fileTree, setFileTree] = useState([]);
    const [currentFileIndex, setCurrentFileIndex] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ processed: 0, total: 0, filename: '' });

    // Computed current track
    const currentTrack = useMemo(() => {
        if (currentFileIndex !== null && files[currentFileIndex]) {
            return files[currentFileIndex];
        }
        return null;
    }, [currentFileIndex, files]);

    // Helper for non-blocking UI
    const waitNextFrame = () => new Promise((resolve) => setTimeout(resolve, 0));

    // Initialize from DB
    useEffect(() => {
        const init = async () => {
            try {
                setIsLoading(true);
                const storedFiles = await dbService.getAllFiles();

                if (storedFiles && storedFiles.length > 0) {
                    // setIsProcessing(true); // Don't show overlay for initial restore
                    setProgress({ processed: 0, total: storedFiles.length, filename: 'Initializing...' });

                    const CHUNK_SIZE = 50;
                    const preparedFiles = [];

                    for (let i = 0; i < storedFiles.length; i += CHUNK_SIZE) {
                        const chunk = storedFiles.slice(i, i + CHUNK_SIZE);
                        // Revive URLs
                        const chunkResult = chunk.map((f) => ({
                            ...f,
                            url: URL.createObjectURL(f.file || f.originalFile),
                        }));
                        preparedFiles.push(...chunkResult);
                        setProgress({
                            processed: Math.min(i + CHUNK_SIZE, storedFiles.length),
                            total: storedFiles.length,
                            filename: chunk[0].name,
                        });
                        await waitNextFrame();
                    }

                    const { sortedFiles, fileTree: newTree } = processFilesForPlayer(preparedFiles);
                    setFiles(preparedFiles); // Should used sortedFiles if processFilesForPlayer returns them sorted?
                    // Actually original code did: setFiles(preparedFiles) but used sortedFiles for return.
                    // Let's match original logic:
                    // Original: setFiles(preparedFiles); setFileTree(newTree);
                    // Wait, original logic sorted them in processFilesForPlayer.
                    // Let's trust the processFilesForPlayer returns correct structure for tree,
                    // and 'files' flat list is just for indexing.
                    // We should probably ensure 'files' IS the sorted list to make next/prev work logically.
                    setFiles(sortedFiles);
                    setFileTree(newTree);
                }
            } catch (e) {
                console.error('Failed to load files from DB', e);
            } finally {
                setIsLoading(false);
                setIsProcessing(false);
            }
        };
        init();
    }, []);

    const handleFiles = async (input, reset = false) => {
        const newFilesList = Array.from(input);
        if (newFilesList.length === 0) return;

        setIsProcessing(true);
        setProgress({ processed: 0, total: newFilesList.length, filename: 'Starting...' });

        try {
            let finalFilesFn = [];

            if (!reset) {
                finalFilesFn = [...files];
            } else {
                files.forEach((f) => URL.revokeObjectURL(f.url));
                await dbService.clearAll();
            }

            const CHUNK_SIZE = 20;
            const processedNewFiles = [];

            for (let i = 0; i < newFilesList.length; i += CHUNK_SIZE) {
                const chunk = newFilesList.slice(i, i + CHUNK_SIZE);
                const { sortedFiles: normalizedChunk } = processFilesForPlayer(chunk);

                const dbItems = normalizedChunk.map((f) => ({
                    id: f.id,
                    name: f.name,
                    path: f.path,
                    originalFile: f.originalFile,
                }));
                await dbService.saveFiles(dbItems);

                const readyChunk = normalizedChunk.map((f) => ({
                    ...f,
                    markers: [],
                    url: URL.createObjectURL(f.originalFile),
                }));

                processedNewFiles.push(...readyChunk);
                setProgress({
                    processed: Math.min(i + CHUNK_SIZE, newFilesList.length),
                    total: newFilesList.length,
                    filename: chunk[0].name,
                });
                await waitNextFrame();
            }

            const combined = [...finalFilesFn, ...processedNewFiles];
            const uniqueMap = new Map();
            combined.forEach((f) => uniqueMap.set(f.id, f));
            const finalUniqueList = Array.from(uniqueMap.values());

            const { sortedFiles, fileTree: newTree } = processFilesForPlayer(finalUniqueList);
            setFiles(sortedFiles);
            setFileTree(newTree);
        } catch (err) {
            console.error('Error processing files:', err);
            alert('Failed to process files. Please refresh the page and try again.\nError: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const clearPlaylist = async () => {
        setCurrentFileIndex(null);
        files.forEach((f) => URL.revokeObjectURL(f.url));
        setFiles([]);
        setFileTree([]);
        await dbService.clearAll();
    };

    const handleDeleteItem = async (node) => {
        const extractFileIdsFromNode = (n, idSet = new Set()) => {
            if (n.type === 'file') {
                idSet.add(n.fileData.id);
            } else if (n.children) {
                n.children.forEach((child) => extractFileIdsFromNode(child, idSet));
            }
            return idSet;
        };

        const idsToRemove = extractFileIdsFromNode(node);
        if (idsToRemove.size === 0) return;

        const currentTrackId = currentTrack?.id;
        const newFiles = files.filter((f) => !idsToRemove.has(f.id));

        files.forEach((f) => {
            if (idsToRemove.has(f.id)) URL.revokeObjectURL(f.url);
        });

        const { sortedFiles, fileTree: newTree } = processFilesForPlayer(newFiles);
        setFiles(sortedFiles);
        setFileTree(newTree);

        if (currentTrackId && !idsToRemove.has(currentTrackId)) {
            const newIndex = sortedFiles.findIndex((f) => f.id === currentTrackId);
            setCurrentFileIndex(newIndex);
        } else if (currentTrackId && idsToRemove.has(currentTrackId)) {
            setCurrentFileIndex(null);
        }

        try {
            await dbService.deleteFiles(Array.from(idsToRemove));
        } catch (err) {
            console.error('Failed to delete from DB', err);
        }
    };

    const nextTrack = useCallback(() => {
        if (currentFileIndex !== null && currentFileIndex < files.length - 1) {
            setCurrentFileIndex(currentFileIndex + 1);
            return true;
        }
        return false;
    }, [currentFileIndex, files.length]);

    const prevTrack = useCallback(() => {
        if (currentFileIndex !== null && currentFileIndex > 0) {
            setCurrentFileIndex(currentFileIndex - 1);
            return true;
        }
        return false;
    }, [currentFileIndex]);

    const playFileById = useCallback(
        (id) => {
            const idx = files.findIndex((f) => f.id === id);
            if (idx !== -1) setCurrentFileIndex(idx);
        },
        [files]
    );

    // Data State
    const [notes, setNotes] = useState([]);
    const [subtitles, setSubtitles] = useState([]);
    const [markers, setMarkers] = useState([]);

    // Load Data for Current Track
    useEffect(() => {
        const loadData = async () => {
            if (!currentTrack) {
                setNotes([]);
                setSubtitles([]);
                setMarkers([]);
                return;
            }
            try {
                const [loadedNotes, loadedSubs, loadedMarkers] = await Promise.all([
                    dbService.getNotes(currentTrack.id),
                    dbService.getSubtitles(currentTrack.id),
                    dbService.getMarkers(currentTrack.id),
                ]);
                setNotes(loadedNotes.sort((a, b) => a.timestamp - b.timestamp));
                setSubtitles(loadedSubs);
                setMarkers(loadedMarkers.sort((a, b) => a.time - b.time));
            } catch (e) {
                console.error('Failed to load data', e);
                setNotes([]);
                setSubtitles([]);
                setMarkers([]);
            }
        };
        loadData();
    }, [currentTrack]);

    const addNote = async (newNote) => {
        if (!currentTrack) return;
        const updatedNotes = [...notes, newNote].sort((a, b) => a.timestamp - b.timestamp);
        setNotes(updatedNotes);
        await dbService.saveNotes(currentTrack.id, updatedNotes);
    };

    const deleteNote = async (noteId) => {
        if (!currentTrack) return;
        const updatedNotes = notes.filter((n) => n.id !== noteId);
        setNotes(updatedNotes);
        await dbService.saveNotes(currentTrack.id, updatedNotes);
    };

    const editNote = async (noteId, newContent) => {
        if (!currentTrack) return;
        const updatedNotes = notes.map((n) => (n.id === noteId ? { ...n, content: newContent } : n));
        setNotes(updatedNotes);
        await dbService.saveNotes(currentTrack.id, updatedNotes);
    };

    const updateSubtitles = async (newSubtitles) => {
        if (!currentTrack) return;
        const sorted = [...newSubtitles].sort((a, b) => a.start - b.start);
        setSubtitles(sorted);
        await dbService.saveSubtitles(currentTrack.id, sorted);
    };

    const addMarker = async (newMarker) => {
        if (!currentTrack) return;
        const updatedMarkers = [...markers, newMarker].sort((a, b) => a.time - b.time);
        setMarkers(updatedMarkers);
        await dbService.saveMarkers(currentTrack.id, updatedMarkers);
    };

    const deleteMarker = async (markerId) => {
        if (!currentTrack) return;
        const updatedMarkers = markers.filter((m) => m.id !== markerId);
        setMarkers(updatedMarkers);
        await dbService.saveMarkers(currentTrack.id, updatedMarkers);
    };

    return (
        <FileSystemContext.Provider
            value={{
                files,
                fileTree,
                currentTrack,
                isLoading,
                isProcessing,
                progress,
                handleFiles,
                clearPlaylist,
                handleDeleteItem,
                nextTrack,
                prevTrack,
                playFileById,
                currentFileIndex, // Exposed for complex logic if needed
                // Data
                notes,
                subtitles,
                markers,
                addNote,
                deleteNote,
                editNote,
                updateSubtitles,
                addMarker,
                deleteMarker,
            }}
        >
            {children}
        </FileSystemContext.Provider>
    );
}

export function useFileSystem() {
    return useContext(FileSystemContext);
}
