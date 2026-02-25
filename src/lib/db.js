import { openDB } from 'idb';

const DB_NAME = 'ShadowingPlayerDB';
const STORE_NAME = 'files';
const NOTES_STORE = 'notes';
const SUBTITLES_STORE = 'subtitles';
const MARKERS_STORE = 'markers';

// Initialize DB
const dbPromise = openDB(DB_NAME, 4, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains(NOTES_STORE)) {
      db.createObjectStore(NOTES_STORE); // Key: fileId, Value: Array of notes
    }
    if (!db.objectStoreNames.contains(SUBTITLES_STORE)) {
      db.createObjectStore(SUBTITLES_STORE); // Key: fileId, Value: Array of subtitles
    }
    if (!db.objectStoreNames.contains(MARKERS_STORE)) {
      db.createObjectStore(MARKERS_STORE); // Key: fileId, Value: Array of markers
    }
  },
});

export const dbService = {
  async saveFiles(files) {
    const db = await dbPromise;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // We store minimal data needed to reconstruct
    // We must store the BLOB (File) explicitly
    const promises = files.map((f) => {
      return store.put({
        id: f.id,
        name: f.name,
        path: f.path, // Preserved path
        file: f.originalFile, // The Blob/File
        lastModified: f.originalFile.lastModified,
      });
    });

    await Promise.all([...promises, tx.done]);
  },

  async getAllFiles() {
    const db = await dbPromise;
    return db.getAll(STORE_NAME);
  },

  async deleteFile(id) {
    const db = await dbPromise;
    const tx = db.transaction([STORE_NAME, NOTES_STORE, SUBTITLES_STORE, MARKERS_STORE], 'readwrite');
    const p1 = tx.objectStore(STORE_NAME).delete(id);
    const p2 = tx.objectStore(NOTES_STORE).delete(id);
    const p3 = tx.objectStore(SUBTITLES_STORE).delete(id);
    const p4 = tx.objectStore(MARKERS_STORE).delete(id);
    await Promise.all([p1, p2, p3, p4, tx.done]);
  },

  async deleteFiles(ids) {
    const db = await dbPromise;
    const tx = db.transaction([STORE_NAME, NOTES_STORE, SUBTITLES_STORE, MARKERS_STORE], 'readwrite');
    const fileStore = tx.objectStore(STORE_NAME);
    const noteStore = tx.objectStore(NOTES_STORE);
    const subStore = tx.objectStore(SUBTITLES_STORE);
    const markerStore = tx.objectStore(MARKERS_STORE);

    const promises = ids.map((id) => {
      fileStore.delete(id);
      noteStore.delete(id);
      subStore.delete(id);
      markerStore.delete(id);
    });
    await Promise.all([...promises, tx.done]);
  },

  async clearAll() {
    const db = await dbPromise;
    const tx = db.transaction([STORE_NAME, NOTES_STORE, SUBTITLES_STORE, MARKERS_STORE], 'readwrite');
    await Promise.all([
      tx.objectStore(STORE_NAME).clear(),
      tx.objectStore(NOTES_STORE).clear(),
      tx.objectStore(SUBTITLES_STORE).clear(),
      tx.objectStore(MARKERS_STORE).clear(),
      tx.done,
    ]);
  },

  // --- Notes ---
  async getNotes(fileId) {
    const db = await dbPromise;
    return (await db.get(NOTES_STORE, fileId)) || [];
  },

  async saveNotes(fileId, notes) {
    const db = await dbPromise;
    return db.put(NOTES_STORE, notes, fileId);
  },

  // --- Subtitles ---
  async getSubtitles(fileId) {
    const db = await dbPromise;
    return (await db.get(SUBTITLES_STORE, fileId)) || [];
  },

  async saveSubtitles(fileId, subtitles) {
    const db = await dbPromise;
    return db.put(SUBTITLES_STORE, subtitles, fileId);
  },

  // --- Markers ---
  async getMarkers(fileId) {
    const db = await dbPromise;
    return (await db.get(MARKERS_STORE, fileId)) || [];
  },

  async saveMarkers(fileId, markers) {
    const db = await dbPromise;
    return db.put(MARKERS_STORE, markers, fileId);
  },
};
