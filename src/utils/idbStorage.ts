import { ServiceUnit } from '../types/process';

const DB_NAME = 'protrace_sop_idb';
const DB_VERSION = 1;
const STORE_NAME = 'units_store';
const ALL_UNITS_KEY = 'all_units';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in current environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target?.result as IDBDatabase;
      if (db && !db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target?.result as IDBDatabase);
    };

    request.onerror = (event: any) => {
      reject(event.target?.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Persist units to high-capacity IndexedDB storage (no 5MB localStorage quota limit).
 */
export async function saveUnitsToIdb(units: ServiceUnit[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(units, ALL_UNITS_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Non-blocking warning
    console.warn('IndexedDB persistence notice:', err);
  }
}

/**
 * Load units from high-capacity IndexedDB storage.
 */
export async function loadUnitsFromIdb(): Promise<ServiceUnit[] | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(ALL_UNITS_KEY);
      req.onsuccess = () => {
        const result = req.result;
        if (Array.isArray(result) && result.length > 0) {
          resolve(result as ServiceUnit[]);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Clear units from IndexedDB if requested.
 */
export async function clearUnitsIdb(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(ALL_UNITS_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB clear warning:', err);
  }
}
