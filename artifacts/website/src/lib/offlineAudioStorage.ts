/**
 * Offline Audio Storage for "Mera Mobile Device"
 * Uses browser IndexedDB to persist local audio files (Blobs) completely offline.
 * Works 100% without internet ("bina net ke").
 */

export interface OfflineSong {
  id: string;
  name: string;
  blob: Blob;
  size: number;
  type: string;
  addedAt: number;
  url?: string;
}

const DB_NAME = 'SyncBeatOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_songs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineSongs(files: File[]): Promise<OfflineSong[]> {
  try {
    const db = await openDB();
    const savedList: OfflineSong[] = [];

    for (const file of files) {
      const id = 'offline_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const song: OfflineSong = {
        id,
        name: file.name.replace(/\.[^.]+$/, ''),
        blob: file,
        size: file.size,
        type: file.type || 'audio/mpeg',
        addedAt: Date.now(),
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(song);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      song.url = URL.createObjectURL(song.blob);
      savedList.push(song);
    }

    return savedList;
  } catch (err) {
    console.warn('[OfflineStorage] Error saving offline songs:', err);
    // Fallback: create temporary memory object URLs
    return files.map((file) => ({
      id: 'mem_' + Math.random().toString(36).substring(2, 7),
      name: file.name.replace(/\.[^.]+$/, ''),
      blob: file,
      size: file.size,
      type: file.type || 'audio/mpeg',
      addedAt: Date.now(),
      url: URL.createObjectURL(file),
    }));
  }
}

export async function getAllOfflineSongs(): Promise<OfflineSong[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const rawSongs = (request.result || []) as OfflineSong[];
        const songsWithUrls = rawSongs.map((s) => ({
          ...s,
          url: URL.createObjectURL(s.blob),
        }));
        resolve(songsWithUrls);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[OfflineStorage] Error reading offline songs:', err);
    return [];
  }
}

export async function deleteOfflineSong(id: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[OfflineStorage] Error deleting offline song:', err);
    return false;
  }
}
