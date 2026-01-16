import { openDB } from 'idb';

const DB_NAME = 'ShadowingPlayerDB';
const STORE_NAME = 'files';

// Initialize DB
const dbPromise = openDB(DB_NAME, 1, {
    upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
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
        const promises = files.map(f => {
            return store.put({
                id: f.id,
                name: f.name,
                path: f.path, // Preserved path
                file: f.originalFile, // The Blob/File
                lastModified: f.originalFile.lastModified
            });
        });

        await Promise.all([...promises, tx.done]);
    },

    async getAllFiles() {
        const db = await dbPromise;
        return db.getAll(STORE_NAME);
    },

    async clearAll() {
        const db = await dbPromise;
        return db.clear(STORE_NAME);
    }
};
