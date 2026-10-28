import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  OperationType,
  handleFirestoreError
} from '../lib/firebase';
import { ServiceUnit } from '../types/process';
import { loadAllUnits, saveAllUnits } from '../utils/storage';
import { recordQuotaOperation } from '../utils/quotaTracker';

const COLLECTION_NAME = 'serviceUnits';

// Track Firestore quota exhaustion to avoid spamming the backend when daily free quota is exceeded
let quotaExhausted = false;
let quotaExhaustedTimestamp = 0;

export function isFirestoreQuotaExhausted(): boolean {
  if (quotaExhausted && Date.now() - quotaExhaustedTimestamp > 3600000) {
    quotaExhausted = false;
  }
  return quotaExhausted;
}

export function markQuotaExhausted() {
  if (!quotaExhausted) {
    quotaExhausted = true;
    quotaExhaustedTimestamp = Date.now();
    console.info('Cloud Firestore: Daily free write quota reached. Active in offline-first local depot mode. All records safely preserved locally.');
  }
}

export function clearQuotaExhausted() {
  quotaExhausted = false;
  quotaExhaustedTimestamp = 0;
  console.info('Cloud Firestore: Quota circuit breaker reset.');
}

function isQuotaError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || String(error)).toLowerCase();
  const code = (error.code || '').toLowerCase();
  return (
    code === 'resource-exhausted' ||
    msg.includes('quota') ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota metric')
  );
}

function isPermissionError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || String(error)).toLowerCase();
  const code = (error.code || '').toLowerCase();
  return (
    code === 'permission-denied' ||
    msg.includes('permission') ||
    msg.includes('insufficient permissions')
  );
}

// Helper to sanitize Firestore documents (Firestore forbids undefined values)
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean;
  }
  return obj;
}

/**
 * Real-time subscription to service units stored in Cloud Firestore.
 * Automatically seeds default units from local storage if the database collection is empty.
 */
export function subscribeToFirestoreUnits(
  onUnitsUpdated: (units: ServiceUnit[]) => void,
  onError?: (error: Error) => void
): () => void {
  const unitsRef = collection(db, COLLECTION_NAME);
  const q = query(unitsRef);

  let initialSyncDone = false;

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        if (!initialSyncDone) {
          initialSyncDone = true;
          const initialLocal = loadAllUnits();
          if (initialLocal.length === 0) {
            onUnitsUpdated([]);
            return;
          }
          // Do not automatically create or re-seed units to cloud when empty
          onUnitsUpdated(initialLocal);
          return;
        } else {
          // All remote units removed; update fleet list to empty
          saveAllUnits([]);
          onUnitsUpdated([]);
          return;
        }
      }

      initialSyncDone = true;
      const remoteUnits: ServiceUnit[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as ServiceUnit;
        if (d && (d.id || d.serialNumber)) {
          // Guarantee id is populated
          if (!d.id) d.id = docSnap.id;
          remoteUnits.push(d);
        }
      });

      // Safely merge with any very recently created local units (<2 mins) not yet in remote snapshot
      const localUnits = loadAllUnits();
      const mergedMap = new Map<string, ServiceUnit>();
      remoteUnits.forEach((u) => mergedMap.set(u.id, u));
      const now = Date.now();
      localUnits.forEach((lu) => {
        if (!mergedMap.has(lu.id)) {
          const createdMs = new Date(lu.createdAt || 0).getTime();
          if (now - createdMs < 120000) {
            mergedMap.set(lu.id, lu);
          }
        }
      });

      const finalUnits = Array.from(mergedMap.values());
      if (finalUnits.length > 0) {
        finalUnits.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        saveAllUnits(finalUnits);
        onUnitsUpdated(finalUnits);
      } else {
        saveAllUnits([]);
        onUnitsUpdated([]);
      }
    },
    (err: any) => {
      if (isQuotaError(err)) {
        markQuotaExhausted();
      }
      // Fallback to local storage immediately
      const fallback = loadAllUnits();
      onUnitsUpdated(fallback);
      onError?.(err);

      if (isPermissionError(err)) {
        try {
          handleFirestoreError(err, OperationType.LIST, COLLECTION_NAME);
        } catch {
          // Handled
        }
      }
    }
  );

  return unsubscribe;
}

/**
 * Persist a single ServiceUnit to Cloud Firestore.
 * Returns true if synced successfully, false otherwise.
 */
export async function syncUnitToFirestore(unit: ServiceUnit): Promise<boolean> {
  if (isFirestoreQuotaExhausted()) {
    recordQuotaOperation('write', 1, unit.serialNumber, 'circuit_broken', 'Write skipped: daily free quota limit reached');
    return false;
  }
  try {
    const clean = sanitizeForFirestore(unit);
    await setDoc(doc(db, COLLECTION_NAME, unit.id), clean, { merge: true });
    recordQuotaOperation('write', 1, unit.serialNumber, 'success', `Work Order ${unit.workOrderNumber} synced to cloud`);
    return true;
  } catch (error: any) {
    if (isQuotaError(error)) {
      markQuotaExhausted();
      recordQuotaOperation('write', 1, unit.serialNumber, 'error', error?.message || 'Quota limit exceeded');
      return false;
    }
    recordQuotaOperation('write', 1, unit.serialNumber, 'error', error?.message || 'Failed to sync unit');
    if (isPermissionError(error)) {
      try {
        handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${unit.id}`);
      } catch {
        // Handled
      }
    } else {
      console.warn('Firestore unit sync notice (saved locally):', error?.message || error);
    }
    return false;
  }
}

/**
 * Persist all ServiceUnits to Cloud Firestore in parallel.
 * Returns true if synced successfully, false otherwise.
 */
export async function syncAllUnitsToFirestore(units: ServiceUnit[]): Promise<boolean> {
  if (isFirestoreQuotaExhausted()) {
    recordQuotaOperation('batch_sync', units.length, 'All Units', 'circuit_broken', 'Bulk sync skipped: daily free quota limit reached');
    return false;
  }
  try {
    const promises = units.map((u) => {
      const clean = sanitizeForFirestore(u);
      return setDoc(doc(db, COLLECTION_NAME, u.id), clean, { merge: true });
    });
    await Promise.all(promises);
    recordQuotaOperation('batch_sync', units.length, 'All Fleet Units', 'success', `Manual cloud sync of ${units.length} units completed`);
    return true;
  } catch (error: any) {
    if (isQuotaError(error)) {
      markQuotaExhausted();
      recordQuotaOperation('batch_sync', units.length, 'All Fleet Units', 'error', error?.message || 'Quota limit exceeded');
      return false;
    }
    recordQuotaOperation('batch_sync', units.length, 'All Fleet Units', 'error', error?.message || 'Failed bulk sync');
    if (isPermissionError(error)) {
      try {
        handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
      } catch {
        // Handled
      }
    } else {
      console.warn('Firestore bulk sync notice (saved locally):', error?.message || error);
    }
    return false;
  }
}

/**
 * Delete a unit from Cloud Firestore
 */
export async function deleteUnitFromFirestore(unitId: string): Promise<void> {
  if (isFirestoreQuotaExhausted()) {
    recordQuotaOperation('delete', 1, unitId, 'circuit_broken', 'Delete skipped: daily free quota limit reached');
    return;
  }
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, unitId));
    recordQuotaOperation('delete', 1, unitId, 'success', `Purged unit document #${unitId} from Firestore`);
  } catch (error: any) {
    if (isQuotaError(error)) {
      markQuotaExhausted();
      recordQuotaOperation('delete', 1, unitId, 'error', error?.message || 'Quota limit exceeded');
      return;
    }
    recordQuotaOperation('delete', 1, unitId, 'error', error?.message || 'Failed to delete unit');
    if (isPermissionError(error)) {
      try {
        handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${unitId}`);
      } catch {
        // Handled
      }
    } else {
      console.warn('Firestore unit delete notice (removed locally):', error?.message || error);
    }
  }
}
