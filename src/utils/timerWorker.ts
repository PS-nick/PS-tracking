import { ServiceUnit, StepId } from '../types/process';
import { audioAlert } from './audioAlert';

/**
 * Web Worker ticker script for un-throttled background timer heartbeat.
 * Standard browser window setTimeout/setInterval are throttled when tabs/windows are inactive,
 * but Web Workers run continuously in a dedicated OS thread.
 */
const WORKER_SCRIPT = `
  let intervalId = null;
  self.onmessage = function(event) {
    if (event.data === 'START') {
      if (!intervalId) {
        intervalId = setInterval(function() {
          self.postMessage('TICK');
        }, 1000);
      }
    } else if (event.data === 'STOP') {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  };
`;

let sharedWorker: Worker | null = null;
let listeners: Array<() => void> = [];
let fallbackIntervalId: NodeJS.Timeout | null = null;

function getSharedWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }
  if (!sharedWorker) {
    try {
      const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      sharedWorker = new Worker(workerUrl);
      sharedWorker.onmessage = () => {
        listeners.forEach((listener) => {
          try {
            listener();
          } catch (err) {
            console.error('Error executing timer tick listener:', err);
          }
        });
      };
      sharedWorker.postMessage('START');
    } catch (e) {
      console.warn('Web Worker creation failed, using interval fallback:', e);
      sharedWorker = null;
    }
  }
  return sharedWorker;
}

/**
 * Subscribes to the unthrottled background heartbeat ticker.
 * Triggers every ~1000ms even when the window is in the background or minimized.
 * Also hooks into document visibilitychange and window focus events.
 */
export function subscribeToTimerTicker(onTick: () => void): () => void {
  listeners.push(onTick);

  const worker = getSharedWorker();
  if (!worker && !fallbackIntervalId) {
    fallbackIntervalId = setInterval(() => {
      listeners.forEach((l) => l());
    }, 1000);
  }

  // Cross-window and visibility event listeners for instantaneous sync
  const handleImmediateSync = () => {
    onTick();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleImmediateSync);
    window.addEventListener('pageshow', handleImmediateSync);
    window.addEventListener('blur', handleImmediateSync);
    document.addEventListener('visibilitychange', handleImmediateSync);
  }

  return () => {
    listeners = listeners.filter((l) => l !== onTick);
    if (listeners.length === 0) {
      if (sharedWorker) {
        sharedWorker.postMessage('STOP');
        sharedWorker.terminate();
        sharedWorker = null;
      }
      if (fallbackIntervalId) {
        clearInterval(fallbackIntervalId);
        fallbackIntervalId = null;
      }
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleImmediateSync);
      window.removeEventListener('pageshow', handleImmediateSync);
      window.removeEventListener('blur', handleImmediateSync);
      document.removeEventListener('visibilitychange', handleImmediateSync);
    }
  };
}

/**
 * Request desktop notification permissions for timer completion alerts
 */
export function requestNotificationPermission() {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  } catch {
    // Non-fatal if blocked inside iframe
  }
}

/**
 * Triggers a cross-window notification when a process step timer finishes
 */
export function notifyTimerFinished(title: string, body: string) {
  // 1. Audio Alert synthesizer
  audioAlert.playTimerCompleteAlert();

  // 2. Hardware vibration
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([300, 200, 300, 200, 500]);
    } catch {}
  }

  // 3. Desktop native notification (visible even when window is minimized)
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `timer-${Date.now()}`,
      });
    } catch {}
  }
}

export interface SyncTimerResult {
  nextUnits: ServiceUnit[];
  hasChanges: boolean;
  activeTimerCount: number;
  runningTimerTitle?: string;
  completedNotifications: Array<{
    unitId: string;
    serialNumber: string;
    stepId: StepId;
    title: string;
    message: string;
  }>;
}

/**
 * Pure function to reconcile all running timers across the fleet against true wall-clock time.
 * Calculates remaining/elapsed seconds accurately irrespective of window switching or tab throttling.
 */
export function syncAllUnitsTimers(
  units: ServiceUnit[],
  now: number = Date.now()
): SyncTimerResult {
  let hasChanges = false;
  let activeTimerCount = 0;
  let primaryTimerTitle: string | undefined = undefined;
  const completedNotifications: SyncTimerResult['completedNotifications'] = [];

  const nextUnits = units.map((u) => {
    let unitChanged = false;
    let nextUnit = u;

    // --- 1. Final Flush Step Timer ---
    if (u.finalFlush?.isRunning) {
      activeTimerCount++;
      const targetEnd = u.finalFlush.targetEndTimestamp || (now + u.finalFlush.remainingSeconds * 1000);
      const secondsLeft = Math.max(0, Math.ceil((targetEnd - now) / 1000));

      if (secondsLeft <= 0) {
        unitChanged = true;
        nextUnit = {
          ...nextUnit,
          finalFlush: {
            ...nextUnit.finalFlush,
            remainingSeconds: 0,
            isRunning: false,
            timerCompleted: true,
            targetEndTimestamp: undefined,
            // DO NOT auto-complete: flush requires manual technician verification
          },
        };
        completedNotifications.push({
          unitId: u.id,
          serialNumber: u.serialNumber,
          stepId: 'final_flush',
          title: `Precision Final Flush Complete · ${u.serialNumber}`,
          message: `3μm fluid filtration flush cycle finished for WO #${u.workOrderNumber}`,
        });
      } else if (secondsLeft !== u.finalFlush.remainingSeconds || !u.finalFlush.targetEndTimestamp) {
        unitChanged = true;
        nextUnit = {
          ...nextUnit,
          finalFlush: {
            ...nextUnit.finalFlush,
            remainingSeconds: secondsLeft,
            targetEndTimestamp: targetEnd,
          },
        };

        const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
        const s = (secondsLeft % 60).toString().padStart(2, '0');
        if (!primaryTimerTitle) {
          primaryTimerTitle = `(${m}:${s}) Final Flush · ${u.serialNumber}`;
        }
      }
    }

    // --- 2. Oven Bake Step Timer ---
    if (u.oven?.isRunning) {
      activeTimerCount++;
      const targetEnd = u.oven.targetEndTimestamp || (now + u.oven.remainingSeconds * 1000);
      const secondsLeft = Math.max(0, Math.ceil((targetEnd - now) / 1000));

      if (secondsLeft <= 0) {
        unitChanged = true;
        nextUnit = {
          ...nextUnit,
          oven: {
            ...nextUnit.oven,
            remainingSeconds: 0,
            isRunning: false,
            timerCompleted: true,
            targetEndTimestamp: undefined,
            completedAt: new Date(now).toISOString(),
          },
        };
        completedNotifications.push({
          unitId: u.id,
          serialNumber: u.serialNumber,
          stepId: 'oven',
          title: `Oven Thermal Bake Complete · ${u.serialNumber}`,
          message: `Thermal cycle reached target bake duration for WO #${u.workOrderNumber}`,
        });
      } else if (secondsLeft !== u.oven.remainingSeconds || !u.oven.targetEndTimestamp) {
        unitChanged = true;
        nextUnit = {
          ...nextUnit,
          oven: {
            ...nextUnit.oven,
            remainingSeconds: secondsLeft,
            targetEndTimestamp: targetEnd,
          },
        };

        const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
        const s = (secondsLeft % 60).toString().padStart(2, '0');
        if (!primaryTimerTitle) {
          primaryTimerTitle = `(${m}:${s}) Oven Bake · ${u.serialNumber}`;
        }
      }
    }

    // --- 3. Gilling Step Up-Time Timer ---
    if (u.gilling?.isRunning) {
      activeTimerCount++;
      const target = u.gilling.targetSeconds || 420;
      const currentElapsed = u.gilling.elapsedSeconds ?? 0;
      const startedAt = u.gilling.startedAtTimestamp || (now - currentElapsed * 1000);
      const actualElapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
      const nextRemaining = Math.max(0, target - actualElapsed);
      const wasCompleted = u.gilling.timerCompleted;
      const justCompleted = actualElapsed >= target && !wasCompleted;

      if (
        actualElapsed !== u.gilling.elapsedSeconds ||
        nextRemaining !== u.gilling.remainingSeconds ||
        !u.gilling.startedAtTimestamp ||
        justCompleted
      ) {
        unitChanged = true;
        nextUnit = {
          ...nextUnit,
          gilling: {
            ...nextUnit.gilling,
            elapsedSeconds: actualElapsed,
            remainingSeconds: nextRemaining,
            startedAtTimestamp: startedAt,
            timerCompleted: actualElapsed >= target,
            completedAt: actualElapsed >= target ? (nextUnit.gilling.completedAt || new Date(now).toISOString()) : nextUnit.gilling.completedAt,
          },
        };

        if (justCompleted) {
          completedNotifications.push({
            unitId: u.id,
            serialNumber: u.serialNumber,
            stepId: 'gilling',
            title: `Manual Fin Straightening Target Achieved · ${u.serialNumber}`,
            message: `Target manual fin work duration of ${Math.round(target / 60)} min reached for WO #${u.workOrderNumber} (100% manual job, no jigs used)`,
          });
        }

        const m = Math.floor(actualElapsed / 60).toString().padStart(2, '0');
        const s = (actualElapsed % 60).toString().padStart(2, '0');
        if (!primaryTimerTitle) {
          primaryTimerTitle = `(${m}:${s}) Fin Straightening · ${u.serialNumber}`;
        }
      }
    }

    // --- 4. First Flush: 3 Sub-Timers (Port 1, Port 2, Desoaping) + Main Timer ---
    if (u.firstFlush) {
      const ff = u.firstFlush;
      let ffChanged = false;
      let nextFF = { ...ff };

      // 4A: Powerwash Port 1 (2 min / 120s)
      if (ff.phase1PowerwashPort1?.isRunning) {
        activeTimerCount++;
        const targetEnd = ff.phase1PowerwashPort1.targetEndTimestamp || (now + ff.phase1PowerwashPort1.remainingSeconds * 1000);
        const secondsLeft = Math.max(0, Math.ceil((targetEnd - now) / 1000));

        if (secondsLeft <= 0) {
          ffChanged = true;
          nextFF.phase1PowerwashPort1 = {
            ...ff.phase1PowerwashPort1,
            remainingSeconds: 0,
            isRunning: false,
            timerCompleted: true,
            targetEndTimestamp: undefined,
            completedAt: new Date(now).toISOString(),
          };
          completedNotifications.push({
            unitId: u.id,
            serialNumber: u.serialNumber,
            stepId: 'first_flush',
            title: `Port 1 Powerwash Complete · ${u.serialNumber}`,
            message: `2-minute Powerwash cycle completed for Port 1 on WO #${u.workOrderNumber}`,
          });
        } else if (secondsLeft !== ff.phase1PowerwashPort1.remainingSeconds || !ff.phase1PowerwashPort1.targetEndTimestamp) {
          ffChanged = true;
          nextFF.phase1PowerwashPort1 = {
            ...ff.phase1PowerwashPort1,
            remainingSeconds: secondsLeft,
            targetEndTimestamp: targetEnd,
          };
          const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
          const s = (secondsLeft % 60).toString().padStart(2, '0');
          if (!primaryTimerTitle) {
            primaryTimerTitle = `(${m}:${s}) Port 1 Flush · ${u.serialNumber}`;
          }
        }
      }

      // 4B: Powerwash Port 2 (2 min / 120s)
      if (ff.phase2PowerwashPort2?.isRunning) {
        activeTimerCount++;
        const targetEnd = ff.phase2PowerwashPort2.targetEndTimestamp || (now + ff.phase2PowerwashPort2.remainingSeconds * 1000);
        const secondsLeft = Math.max(0, Math.ceil((targetEnd - now) / 1000));

        if (secondsLeft <= 0) {
          ffChanged = true;
          nextFF.phase2PowerwashPort2 = {
            ...ff.phase2PowerwashPort2,
            remainingSeconds: 0,
            isRunning: false,
            timerCompleted: true,
            targetEndTimestamp: undefined,
            completedAt: new Date(now).toISOString(),
          };
          completedNotifications.push({
            unitId: u.id,
            serialNumber: u.serialNumber,
            stepId: 'first_flush',
            title: `Port 2 Powerwash Complete · ${u.serialNumber}`,
            message: `2-minute Powerwash cycle completed for Port 2 on WO #${u.workOrderNumber}`,
          });
        } else if (secondsLeft !== ff.phase2PowerwashPort2.remainingSeconds || !ff.phase2PowerwashPort2.targetEndTimestamp) {
          ffChanged = true;
          nextFF.phase2PowerwashPort2 = {
            ...ff.phase2PowerwashPort2,
            remainingSeconds: secondsLeft,
            targetEndTimestamp: targetEnd,
          };
          const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
          const s = (secondsLeft % 60).toString().padStart(2, '0');
          if (!primaryTimerTitle) {
            primaryTimerTitle = `(${m}:${s}) Port 2 Flush · ${u.serialNumber}`;
          }
        }
      }

      // 4C: Desoaping / Neutral Flush
      if (ff.phase3Desoaping?.isRunning) {
        activeTimerCount++;
        const targetEnd = ff.phase3Desoaping.targetEndTimestamp || (now + ff.phase3Desoaping.remainingSeconds * 1000);
        const secondsLeft = Math.max(0, Math.ceil((targetEnd - now) / 1000));

        if (secondsLeft <= 0) {
          ffChanged = true;
          nextFF.phase3Desoaping = {
            ...ff.phase3Desoaping,
            remainingSeconds: 0,
            isRunning: false,
            timerCompleted: true,
            targetEndTimestamp: undefined,
            completedAt: new Date(now).toISOString(),
          };
          completedNotifications.push({
            unitId: u.id,
            serialNumber: u.serialNumber,
            stepId: 'first_flush',
            title: `Desoaping Flush Complete · ${u.serialNumber}`,
            message: `Desoaping neutral flush completed for WO #${u.workOrderNumber}`,
          });
        } else if (secondsLeft !== ff.phase3Desoaping.remainingSeconds || !ff.phase3Desoaping.targetEndTimestamp) {
          ffChanged = true;
          nextFF.phase3Desoaping = {
            ...ff.phase3Desoaping,
            remainingSeconds: secondsLeft,
            targetEndTimestamp: targetEnd,
          };
          const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
          const s = (secondsLeft % 60).toString().padStart(2, '0');
          if (!primaryTimerTitle) {
            primaryTimerTitle = `(${m}:${s}) Desoaping · ${u.serialNumber}`;
          }
        }
      }

      // 4D: Main First Flush Timer (if active)
      if (ff.isRunning) {
        activeTimerCount++;
        const targetEnd = ff.targetEndTimestamp || (now + (ff.remainingSeconds ?? 120) * 1000);
        const secondsLeft = Math.max(0, Math.ceil((targetEnd - now) / 1000));

        if (secondsLeft <= 0) {
          ffChanged = true;
          nextFF = {
            ...nextFF,
            remainingSeconds: 0,
            isRunning: false,
            timerCompleted: true,
            targetEndTimestamp: undefined,
          };
          completedNotifications.push({
            unitId: u.id,
            serialNumber: u.serialNumber,
            stepId: 'first_flush',
            title: `55°C First Flush Cycle Complete · ${u.serialNumber}`,
            message: `Deionized water flush completed for WO #${u.workOrderNumber}`,
          });
        } else if (secondsLeft !== ff.remainingSeconds || !ff.targetEndTimestamp) {
          ffChanged = true;
          nextFF = {
            ...nextFF,
            remainingSeconds: secondsLeft,
            targetEndTimestamp: targetEnd,
          };
          const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
          const s = (secondsLeft % 60).toString().padStart(2, '0');
          if (!primaryTimerTitle) {
            primaryTimerTitle = `(${m}:${s}) 55°C First Flush · ${u.serialNumber}`;
          }
        }
      }

      if (ffChanged) {
        unitChanged = true;
        nextUnit = {
          ...nextUnit,
          firstFlush: nextFF,
        };
      }
    }

    // --- 5. Degreasing Oil Draining Timer ---
    if (u.degreasing?.oilDraining?.isRunning) {
      activeTimerCount++;
      const od = u.degreasing.oilDraining;
      const targetEnd = od.targetEndTimestamp || (now + (od.remainingSeconds ?? 900) * 1000);
      const secondsLeft = Math.max(0, Math.ceil((targetEnd - now) / 1000));

      if (secondsLeft <= 0) {
        unitChanged = true;
        nextUnit = {
          ...nextUnit,
          degreasing: {
            ...nextUnit.degreasing,
            oilDraining: {
              ...od,
              remainingSeconds: 0,
              isRunning: false,
              timerCompleted: true,
              performed: true,
              targetEndTimestamp: undefined,
              completedAt: new Date(now).toISOString(),
            },
          },
        };
        completedNotifications.push({
          unitId: u.id,
          serialNumber: u.serialNumber,
          stepId: 'degreasing',
          title: `Oil Draining Complete · ${u.serialNumber}`,
          message: `Matrix fluid scavenge finished for WO #${u.workOrderNumber}`,
        });
      } else if (secondsLeft !== od.remainingSeconds || !od.targetEndTimestamp) {
        unitChanged = true;
        nextUnit = {
          ...nextUnit,
          degreasing: {
            ...nextUnit.degreasing,
            oilDraining: {
              ...od,
              remainingSeconds: secondsLeft,
              targetEndTimestamp: targetEnd,
            },
          },
        };
        const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
        const s = (secondsLeft % 60).toString().padStart(2, '0');
        if (!primaryTimerTitle) {
          primaryTimerTitle = `(${m}:${s}) Oil Drain · ${u.serialNumber}`;
        }
      }
    }

    // --- 6. Degreasing Bath / Flow-Through Soak Timer (Never stops when switching tabs) ---
    if (u.degreasing?.soakTimer?.isRunning) {
      activeTimerCount++;
      const st = u.degreasing.soakTimer;
      const targetEnd = st.targetEndTimestamp || (now + (st.remainingSeconds ?? 1500) * 1000);
      const secondsLeft = Math.max(0, Math.ceil((targetEnd - now) / 1000));

      if (secondsLeft <= 0) {
        unitChanged = true;
        nextUnit = {
          ...nextUnit,
          degreasing: {
            ...nextUnit.degreasing,
            soakTimer: {
              ...st,
              remainingSeconds: 0,
              isRunning: false,
              timerCompleted: true,
              targetEndTimestamp: undefined,
              completedAt: new Date(now).toISOString(),
            },
          },
        };
        completedNotifications.push({
          unitId: u.id,
          serialNumber: u.serialNumber,
          stepId: 'degreasing',
          title: `Degrease Bath Soak Complete · ${u.serialNumber}`,
          message: `Solvent flow-through / degrease soak cycle finished for WO #${u.workOrderNumber}`,
        });
      } else if (secondsLeft !== st.remainingSeconds || !st.targetEndTimestamp) {
        unitChanged = true;
        nextUnit = {
          ...nextUnit,
          degreasing: {
            ...nextUnit.degreasing,
            soakTimer: {
              ...st,
              remainingSeconds: secondsLeft,
              targetEndTimestamp: targetEnd,
            },
          },
        };
        const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
        const s = (secondsLeft % 60).toString().padStart(2, '0');
        if (!primaryTimerTitle) {
          primaryTimerTitle = `(${m}:${s}) Degrease Bath · ${u.serialNumber}`;
        }
      }
    }

    // --- 7. Degreasing PreFlush / Soak Timer (Legacy reference) ---
    if (u.degreasing?.preFlush?.isRunning) {
      activeTimerCount++;
      const pf = u.degreasing.preFlush;
      const targetEnd = pf.targetEndTimestamp || (now + (pf.remainingSeconds ?? 360) * 1000);
      const secondsLeft = Math.max(0, Math.ceil((targetEnd - now) / 1000));

      if (secondsLeft <= 0) {
        unitChanged = true;
        nextUnit = {
          ...nextUnit,
          degreasing: {
            ...nextUnit.degreasing,
            preFlush: {
              ...pf,
              remainingSeconds: 0,
              isRunning: false,
              timerCompleted: true,
              targetEndTimestamp: undefined,
            },
          },
        };
      } else if (secondsLeft !== pf.remainingSeconds || !pf.targetEndTimestamp) {
        unitChanged = true;
        nextUnit = {
          ...nextUnit,
          degreasing: {
            ...nextUnit.degreasing,
            preFlush: {
              ...pf,
              remainingSeconds: secondsLeft,
              targetEndTimestamp: targetEnd,
            },
          },
        };
      }
    }

    // --- 8. First Flush Drying Process Timer (Moisture evacuation before re-degrease) ---
    if (u.firstFlush?.dryingProcess?.isRunning) {
      activeTimerCount++;
      const dp = u.firstFlush.dryingProcess;
      const targetEnd = dp.targetEndTimestamp || (now + (dp.remainingSeconds ?? 180) * 1000);
      const secondsLeft = Math.max(0, Math.ceil((targetEnd - now) / 1000));

      if (secondsLeft <= 0) {
        unitChanged = true;
        nextUnit = {
          ...nextUnit,
          firstFlush: {
            ...nextUnit.firstFlush!,
            dryingProcess: {
              ...dp,
              remainingSeconds: 0,
              isRunning: false,
              timerCompleted: true,
              coreMoistureEvacuated: true,
              targetEndTimestamp: undefined,
              completedAt: new Date(now).toISOString(),
            },
          },
        };
        completedNotifications.push({
          unitId: u.id,
          serialNumber: u.serialNumber,
          stepId: 'first_flush',
          title: `Drying Process Complete · ${u.serialNumber}`,
          message: `Core moisture purge completed. Oil cooler / core ready for secondary degrease.`,
        });
      } else if (secondsLeft !== dp.remainingSeconds || !dp.targetEndTimestamp) {
        unitChanged = true;
        nextUnit = {
          ...nextUnit,
          firstFlush: {
            ...nextUnit.firstFlush!,
            dryingProcess: {
              ...dp,
              remainingSeconds: secondsLeft,
              targetEndTimestamp: targetEnd,
            },
          },
        };
      }
    }

    // --- 9. Water Bath 5-Minute Gas Flow Pressure Test Timer ---
    if (u.pressureTest?.gasFlowTimer?.isRunning) {
      activeTimerCount++;
      const gft = u.pressureTest.gasFlowTimer;
      const targetEnd = gft.targetEndTimestamp || (now + (gft.remainingSeconds ?? 300) * 1000);
      const secondsLeft = Math.max(0, Math.ceil((targetEnd - now) / 1000));

      if (secondsLeft <= 0) {
        unitChanged = true;
        nextUnit = {
          ...nextUnit,
          pressureTest: {
            ...nextUnit.pressureTest,
            gasFlowTimer: {
              ...gft,
              remainingSeconds: 0,
              isRunning: false,
              timerCompleted: true,
              targetEndTimestamp: undefined,
              completedAt: new Date(now).toISOString(),
            },
          },
        };
        completedNotifications.push({
          unitId: u.id,
          serialNumber: u.serialNumber,
          stepId: 'pressure_test',
          title: `5-Min Water Bath Gas Test Complete · ${u.serialNumber}`,
          message: `5-Minute submerged gas flow cycle completed. Verify zero bubble leakage.`,
        });
      } else if (secondsLeft !== gft.remainingSeconds || !gft.targetEndTimestamp) {
        unitChanged = true;
        nextUnit = {
          ...nextUnit,
          pressureTest: {
            ...nextUnit.pressureTest,
            gasFlowTimer: {
              ...gft,
              remainingSeconds: secondsLeft,
              targetEndTimestamp: targetEnd,
            },
          },
        };
      }
    }

    if (unitChanged) {
      hasChanges = true;
      nextUnit.updatedAt = new Date(now).toISOString();
      return nextUnit;
    }
    return u;
  });

  return {
    nextUnits,
    hasChanges,
    activeTimerCount,
    runningTimerTitle: primaryTimerTitle,
    completedNotifications,
  };
}
