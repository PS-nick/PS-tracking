import { isFirestoreQuotaExhausted, markQuotaExhausted, clearQuotaExhausted } from '../services/firestoreSync';

export interface QuotaOperationLog {
  id: string;
  timestamp: string;
  type: 'write' | 'read' | 'delete' | 'probe' | 'batch_sync';
  count: number;
  target: string;
  status: 'success' | 'circuit_broken' | 'error';
  details?: string;
}

export interface QuotaMetrics {
  date: string;
  writesToday: number;
  readsToday: number;
  deletesToday: number;
  dailyWriteLimit: number;
  dailyReadLimit: number;
  dailyDeleteLimit: number;
  databaseId: string;
  projectNumber: string;
  circuitBreakerActive: boolean;
  autoSaveStatus: 'active_cloud_synced' | 'disabled_protected';
  lastOperationTime?: string;
  recentLogs: QuotaOperationLog[];
}

const STORAGE_KEY = 'depot_firestore_quota_metrics';
export const DAILY_WRITE_LIMIT = 20000;
export const DAILY_READ_LIMIT = 50000;
export const DAILY_DELETE_LIMIT = 20000;
export const DATABASE_ID = 'ai-studio-pstracking-c9be21a9-44a9-4dbd-a91e-8ce55f43f907';
export const PROJECT_NUMBER = '884100651572';

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadQuotaMetrics(): QuotaMetrics {
  const today = getTodayString();
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) {
        return {
          ...parsed,
          dailyWriteLimit: DAILY_WRITE_LIMIT,
          dailyReadLimit: DAILY_READ_LIMIT,
          dailyDeleteLimit: DAILY_DELETE_LIMIT,
          databaseId: DATABASE_ID,
          projectNumber: PROJECT_NUMBER,
          circuitBreakerActive: isFirestoreQuotaExhausted(),
          autoSaveStatus: isFirestoreQuotaExhausted() ? 'disabled_protected' : 'active_cloud_synced',
        };
      }
    }
  } catch (err) {
    console.warn('Failed to parse quota metrics:', err);
  }

  // New day or uninitialized
  const fresh: QuotaMetrics = {
    date: today,
    writesToday: 0,
    readsToday: 0,
    deletesToday: 0,
    dailyWriteLimit: DAILY_WRITE_LIMIT,
    dailyReadLimit: DAILY_READ_LIMIT,
    dailyDeleteLimit: DAILY_DELETE_LIMIT,
    databaseId: DATABASE_ID,
    projectNumber: PROJECT_NUMBER,
    circuitBreakerActive: isFirestoreQuotaExhausted(),
    autoSaveStatus: 'active_cloud_synced',
    recentLogs: [
      {
        id: `init-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'probe',
        count: 0,
        target: 'System Startup',
        status: 'success',
        details: 'Cloud auto-save enabled on intake creation & process stage completions.',
      },
    ],
  };
  saveQuotaMetrics(fresh);
  return fresh;
}

export function saveQuotaMetrics(metrics: QuotaMetrics) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
  } catch {
    // quota storage fallback
  }
}

export function recordQuotaOperation(
  type: 'write' | 'read' | 'delete' | 'probe' | 'batch_sync',
  count: number,
  target: string,
  status: 'success' | 'circuit_broken' | 'error',
  details?: string
): QuotaMetrics {
  const current = loadQuotaMetrics();
  const now = new Date().toISOString();

  if (status === 'success') {
    if (type === 'write' || type === 'batch_sync') {
      current.writesToday += count;
    } else if (type === 'read' || type === 'probe') {
      current.readsToday += count;
    } else if (type === 'delete') {
      current.deletesToday += count;
    }
  }

  const logEntry: QuotaOperationLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now,
    type,
    count,
    target,
    status,
    details,
  };

  current.recentLogs = [logEntry, ...(current.recentLogs || [])].slice(0, 50);
  current.lastOperationTime = now;
  current.circuitBreakerActive = isFirestoreQuotaExhausted();

  saveQuotaMetrics(current);
  return current;
}

export function resetQuotaMetricsCounter(): QuotaMetrics {
  const today = getTodayString();
  const resetMetrics: QuotaMetrics = {
    date: today,
    writesToday: 0,
    readsToday: 0,
    deletesToday: 0,
    dailyWriteLimit: DAILY_WRITE_LIMIT,
    dailyReadLimit: DAILY_READ_LIMIT,
    dailyDeleteLimit: DAILY_DELETE_LIMIT,
    databaseId: DATABASE_ID,
    projectNumber: PROJECT_NUMBER,
    circuitBreakerActive: false,
    autoSaveStatus: 'active_cloud_synced',
    recentLogs: [
      {
        id: `reset-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'probe',
        count: 0,
        target: 'Manual Reset',
        status: 'success',
        details: 'Technician reset metrics counter; cloud auto-save active.',
      },
    ],
  };
  clearQuotaExhausted();
  saveQuotaMetrics(resetMetrics);
  return resetMetrics;
}

export function getTimeUntilUtcMidnight(): string {
  const now = new Date();
  const utcTomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  const diffMs = utcTomorrow.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}
