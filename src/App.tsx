import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  loadAllUnits, 
  saveAllUnits, 
  getActiveUnitId, 
  setActiveUnitId,
  loadUnitsFromIdb
} from './utils/storage';
import { ServiceUnit, StepId, ActivityEntry } from './types/process';
import { Header, CloudSyncStatus } from './components/Header';
import { PipelineNav } from './components/PipelineNav';
import { IntakeStep } from './components/steps/IntakeStep';
import { DegreasingStep } from './components/steps/DegreasingStep';
import { DescalingStep } from './components/steps/DescalingStep';
import { FirstFlushStep } from './components/steps/FirstFlushStep';
import { FlowTestingStep } from './components/steps/FlowTestingStep';
import { PressureTestingStep } from './components/steps/PressureTestingStep';
import { CleaningStep } from './components/steps/CleaningStep';
import { FinalFlushStep } from './components/steps/FinalFlushStep';
import { OvenStep } from './components/steps/OvenStep';
import { GillingStep } from './components/steps/GillingStep';
import { SignOffStep } from './components/steps/SignOffStep';
import { AuditLogDrawer } from './components/AuditLogDrawer';
import { CertificateModal } from './components/CertificateModal';
import { NewUnitModal } from './components/NewUnitModal';
import { Dashboard } from './components/Dashboard';
import { ServiceAnalyticsView } from './components/ServiceAnalyticsView';
import { DailyQuotaView } from './components/DailyQuotaView';
import { QrCodeScannerModal } from './components/QrCodeScannerModal';
import { UnitQrLabelModal } from './components/UnitQrLabelModal';
import { WorkbenchSheetModal } from './components/WorkbenchSheetModal';
import { AuthModal } from './components/AuthModal';
import { DeleteUnitModal } from './components/DeleteUnitModal';
import { CustomerPortalView } from './components/CustomerPortalView';
import { CustomerProcessMapView } from './components/CustomerProcessMapView';
import { ServiceTechnicianLoginModal } from './components/ServiceTechnicianLoginModal';
import { DeliveryTrackingModal } from './components/DeliveryTrackingModal';
import { LoginScreen } from './components/LoginScreen';
import { WelcomeScreen } from './components/WelcomeScreen';
import { StageQrPlacardsModal } from './components/StageQrPlacardsModal';
import { getAllocatedUnitsForCustomer, isUnitAllocatedToTeam } from './utils/customerAllocation';
import { useAuth } from './context/AuthContext';
import { 
  subscribeToFirestoreUnits, 
  syncUnitToFirestore, 
  syncAllUnitsToFirestore,
  deleteUnitFromFirestore,
  isFirestoreQuotaExhausted
} from './services/firestoreSync';
import { History, Volume2, VolumeX, Cloud, CheckCircle2, Lock, Wrench } from 'lucide-react';
import { audioAlert } from './utils/audioAlert';
import { ScannedUnitPayload, ComponentType } from './types/process';
import { createNewUnit, deleteUnitFromStorage } from './utils/storage';
import { 
  subscribeToTimerTicker, 
  syncAllUnitsTimers, 
  notifyTimerFinished, 
  requestNotificationPermission 
} from './utils/timerWorker';

export default function App() {
  const [units, setUnits] = useState<ServiceUnit[]>(() => loadAllUnits());
  const [activeUnitId, setUnitId] = useState<string>(() => {
    const all = loadAllUnits();
    const stored = getActiveUnitId();
    return all.find((u) => u.id === stored)?.id || all[0]?.id || '';
  });

  const { isAssignedPerson, profile, isCustomer, portalMode, setPortalMode } = useAuth();

  // Welcome Screen Gate: Users see the dedicated Welcome Screen with logins before entering the app
  const [hasEnteredApp, setHasEnteredApp] = useState<boolean>(() => {
    try {
      const entered = sessionStorage.getItem('depot_has_entered_app');
      return entered === 'true';
    } catch {
      return false;
    }
  });

  // Strict Customer Team Data Isolation (AS9100D Sec 8.1 compliance)
  // When logged in as a customer, visibleUnits contains ONLY the units of their team!
  const visibleUnits = useMemo<ServiceUnit[]>(() => {
    if (isCustomer && profile) {
      const email = profile.customerEmail || profile.email;
      const teamName = profile.customerName;
      return units.filter((u: ServiceUnit) => isUnitAllocatedToTeam(u, email, teamName));
    }
    return units;
  }, [units, isCustomer, profile]);

  const activeUnit = visibleUnits.find((u: ServiceUnit) => u.id === activeUnitId) || visibleUnits[0] || null;

  // Auto-align activeUnitId if it points to an unauthorized unit in customer mode
  useEffect(() => {
    if (visibleUnits.length > 0 && !visibleUnits.some((u: ServiceUnit) => u.id === activeUnitId)) {
      setUnitId(visibleUnits[0].id);
    }
  }, [visibleUnits, activeUnitId]);

  const [activeStep, setActiveStep] = useState<StepId>(activeUnit?.currentStepId || 'intake');
  const [currentView, setCurrentView] = useState<'dashboard' | 'analytics' | 'workflow' | 'quota' | 'customer_portal'>(() => {
    try {
      const savedMode = localStorage.getItem('depot_portal_mode');
      if (savedMode === 'customer') return 'customer_portal';
    } catch {}
    return 'dashboard';
  });

  // Stage QR Placards Modal State
  const [isStageQrModalOpen, setIsStageQrModalOpen] = useState(false);

  const [isTechLoginModalOpen, setIsTechLoginModalOpen] = useState(false);
  const [techLoginReason, setTechLoginReason] = useState<string | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryUnit, setDeliveryUnit] = useState<ServiceUnit | null>(null);

  const handlePromptTechnicianLogin = (reason?: string) => {
    setTechLoginReason(reason || null);
    setIsTechLoginModalOpen(true);
  };

  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [isCertOpen, setIsCertOpen] = useState(false);
  const [certUnit, setCertUnit] = useState<ServiceUnit | null>(activeUnit);
  const [isWorkbenchSheetOpen, setIsWorkbenchSheetOpen] = useState(false);
  const [workbenchUnit, setWorkbenchUnit] = useState<ServiceUnit | null>(activeUnit);
  const [isNewUnitModalOpen, setIsNewUnitModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<ServiceUnit | null>(null);
  const [lastViewedLogCount, setLastViewedLogCount] = useState<number>(activeUnit?.activityLog?.length || 0);

  // QR Code Scanner and Tag Asset Modals
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isUnitQrModalOpen, setIsUnitQrModalOpen] = useState(false);
  const [qrModalUnit, setQrModalUnit] = useState<ServiceUnit | null>(activeUnit);
  const [scannedInitialData, setScannedInitialData] = useState<ScannedUnitPayload | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('cloud_synced');

  // Monitor network connectivity & quota to set primary source of truth indicator
  useEffect(() => {
    const updateStatus = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncStatus('offline_mode');
      } else if (isFirestoreQuotaExhausted()) {
        setSyncStatus('offline_mode');
      } else {
        setSyncStatus('cloud_synced');
      }
    };

    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  // Real-time Cloud Firestore synchronization
  useEffect(() => {
    const unsubscribe = subscribeToFirestoreUnits(
      (remoteUnits) => {
        setUnits(remoteUnits || []);
        if (isFirestoreQuotaExhausted() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
          setSyncStatus('offline_mode');
        } else {
          setSyncStatus('cloud_synced');
        }
      },
      (error) => {
        console.warn('Firestore subscription fallback to local storage:', error);
        setSyncStatus('offline_mode');
      }
    );
    return () => unsubscribe();
  }, []);

  // Listen for local depot unit updates (e.g. customer deletion or storage purging)
  useEffect(() => {
    const handleUnitsChanged = () => {
      const fresh = loadAllUnits();
      setUnits(fresh);
    };
    window.addEventListener('depot_units_updated', handleUnitsChanged);
    window.addEventListener('depot_custom_customers_changed', handleUnitsChanged);
    return () => {
      window.removeEventListener('depot_units_updated', handleUnitsChanged);
      window.removeEventListener('depot_custom_customers_changed', handleUnitsChanged);
    };
  }, []);

  // Startup recovery from high-capacity IndexedDB store (recovering high-resolution photos and complete logs)
  useEffect(() => {
    loadUnitsFromIdb().then((idbUnits) => {
      if (idbUnits && idbUnits.length > 0) {
        setUnits((current) => {
          if (current.length === 0) {
            unitsRef.current = idbUnits;
            return idbUnits;
          }
          const idbMap = new Map(idbUnits.map((u) => [u.id, u]));
          const merged = current.map((curr) => {
            const match = idbMap.get(curr.id);
            if (!match) return curr;
            const hasIdbPhotos = (match.intake?.photos || []).some((p) => p.url && !p.url.includes('data:image/svg'));
            const hasCurrPhotos = (curr.intake?.photos || []).some((p) => p.url && !p.url.includes('data:image/svg'));
            if (hasIdbPhotos && !hasCurrPhotos) {
              return {
                ...curr,
                intake: {
                  ...curr.intake,
                  photos: match.intake?.photos || curr.intake?.photos,
                  boxInspection: match.intake?.boxInspection || curr.intake?.boxInspection,
                },
                signOff: {
                  ...curr.signOff,
                  pictures: match.signOff?.pictures || curr.signOff?.pictures,
                },
                activityLog: (match.activityLog?.length || 0) > (curr.activityLog?.length || 0) ? match.activityLog : curr.activityLog,
              };
            }
            return curr;
          });
          unitsRef.current = merged;
          return merged;
        });
      }
    }).catch(() => {});
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    audioAlert.setEnabled(next);
    if (next) {
      audioAlert.playClick();
    }
  };

  // Sync active step when active unit changes
  useEffect(() => {
    if (activeUnit) {
      setActiveStep(activeUnit.currentStepId || 'intake');
      setCertUnit(activeUnit);
      setWorkbenchUnit(activeUnit);
      setQrModalUnit(activeUnit);
      setLastViewedLogCount(activeUnit.activityLog?.length || 0);
    } else {
      setCertUnit(null);
      setWorkbenchUnit(null);
      setQrModalUnit(null);
    }
  }, [activeUnitId, activeUnit]);

  // Continuous background process timer engine with un-throttled Web Worker heartbeat
  // Ensures timers keep running accurately across all units even when changing windows, tabs, or views
  useEffect(() => {
    requestNotificationPermission();

    const unsubscribe = subscribeToTimerTicker(() => {
      setUnits((prevUnits) => {
        const result = syncAllUnitsTimers(prevUnits);

        if (result.hasChanges) {
          saveAllUnits(result.nextUnits);

          // Fire cross-window notifications & audio alert for completed timer steps
          result.completedNotifications.forEach((n) => {
            notifyTimerFinished(n.title, n.message);
          });

          // Update browser window tab title with active timer countdown
          if (result.runningTimerTitle) {
            document.title = `${result.runningTimerTitle} · PSTS`;
          } else if (result.completedNotifications.length > 0) {
            document.title = `✓ ${result.completedNotifications[0].title}`;
          }

          return result.nextUnits;
        }

        // Keep window tab title in sync if running timer exists
        if (result.runningTimerTitle) {
          document.title = `${result.runningTimerTitle} · PSTS`;
        }

        return prevUnits;
      });
    });

    return () => {
      unsubscribe();
      document.title = 'Particle Science Tracking System';
    };
  }, []);

  // Listen for image optimization telemetry to display reassuring compression toast
  useEffect(() => {
    const handleImageOptimized = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) {
        const { name, originalFormatted, compressedFormatted, savedPercent } = custom.detail;
        if (savedPercent > 0) {
          setAutoSaveToast({
            message: `Auto-Resized ${name}: ${originalFormatted} → ${compressedFormatted} (${savedPercent}% saved ⚡)`,
            timestamp: Date.now(),
          });
          setTimeout(() => {
            setAutoSaveToast((curr) => (curr && Date.now() - curr.timestamp >= 3800 ? null : curr));
          }, 4000);
        }
      }
    };

    window.addEventListener('image-optimized', handleImageOptimized);
    return () => window.removeEventListener('image-optimized', handleImageOptimized);
  }, []);

  const STEP_SEQUENCE: StepId[] = [
    'intake',
    'degreasing',
    'descaling', // Stage 03: Descaled Internal Passages Cycle (Between Degreasing & First Flush)
    'first_flush', // Stage 04: First Flush (55°C DI Flush)
    'flow_test', // Stage 05: Flow Testing (Flow Dynamics)
    'pressure_test', // Stage 06: Pressure Testing
    'cleaning', // Stage 07: Ultra Fine RIG Cleaning (specs: 5, 10, 25, 50, 100, 200 micron)
    'final_flush', // Stage 08: Final Flush
    'oven', // Stage 09: Thermal Bakeout (Particle Science / Customer Standard)
    'gilling', // Stage 10: Fin Straightening (100% Hand Job / No Jigs)
    'sign_off', // Stage 11: Final Sign-Off
  ];

  const checkUnitStepCompleted = (stepId: StepId, u: ServiceUnit | null): boolean => {
    if (!u) return false;
    switch (stepId) {
      case 'intake':
        return !!u.intake?.completedAt;
      case 'degreasing':
        return !!u.degreasing?.completedAt || u.degreasing?.skipped === true || u.processConfig?.degreasingRequired === false;
      case 'descaling':
        return !!u.descaling?.completedAt || u.descaling?.skipped === true || u.processConfig?.descalingRequired === false;
      case 'first_flush':
        return !!u.firstFlush?.completedAt || u.processConfig?.firstFlushRequired === false;
      case 'flow_test':
        return !!u.flowTest?.completedAt || u.flowTest?.isExempt === true || u.processConfig?.flowTestRequired === false;
      case 'pressure_test':
        return (u.pressureTest?.testResult === 'PASS' || !!u.pressureTest?.completedAt) || u.processConfig?.pressureTestRequired === false;
      case 'cleaning':
        return !!u.cleaning?.completedAt || u.processConfig?.cleaningRequired === false;
      case 'final_flush':
        return !!u.finalFlush?.completedAt || u.processConfig?.finalFlushRequired === false;
      case 'oven':
        return !!u.oven?.completedAt || u.processConfig?.ovenRequired === false;
      case 'gilling':
        return !!u.gilling?.completedAt || u.processConfig?.gillingRequired === false;
      case 'sign_off':
        return !!u.signOff?.completedAt || u.overallStatus === 'completed';
      default:
        return false;
    }
  };

  const [isManualSaving, setIsManualSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date>(new Date());
  const [autoSaveToast, setAutoSaveToast] = useState<{ message: string; timestamp: number } | null>(null);
  const unitsRef = useRef<ServiceUnit[]>(units);
  unitsRef.current = units;
  const activeStepRef = useRef<StepId>(activeStep);
  activeStepRef.current = activeStep;
  const activeUnitIdRef = useRef<string>(activeUnitId);
  activeUnitIdRef.current = activeUnitId;

  // Debounce ref for continuous form typing
  const autoSaveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Directly auto-save a single unit to Cloud Firestore and local storage
  const autoSaveUnitToCloud = useCallback(async (unitToSave: ServiceUnit, reason: string) => {
    if (autoSaveDebounceRef.current) {
      clearTimeout(autoSaveDebounceRef.current);
      autoSaveDebounceRef.current = null;
    }

    setSyncStatus('syncing');
    setLastSavedTime(new Date());

    try {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (isOnline && !isFirestoreQuotaExhausted()) {
        const ok = await syncUnitToFirestore(unitToSave);
        if (ok) {
          setSyncStatus('cloud_synced');
          setAutoSaveToast({ message: `Auto-saved to Cloud · ${reason}`, timestamp: Date.now() });
        } else {
          setSyncStatus('offline_mode');
          setAutoSaveToast({ message: `Saved locally · ${reason}`, timestamp: Date.now() });
        }
      } else {
        setSyncStatus('offline_mode');
        setAutoSaveToast({ message: `Saved locally (Offline Mode) · ${reason}`, timestamp: Date.now() });
      }
    } catch (err) {
      console.warn('Auto-save notice:', err);
      setSyncStatus('offline_mode');
    }

    setTimeout(() => {
      setAutoSaveToast((curr) => (curr && Date.now() - curr.timestamp >= 2800 ? null : curr));
    }, 3000);
  }, []);

  // Auto-save engine triggered after stage transitions
  const performAutoSave = useCallback((reason: string) => {
    try {
      saveAllUnits(unitsRef.current);
      setActiveUnitId(activeUnitIdRef.current);
      localStorage.setItem('depot_active_step', activeStepRef.current);
      localStorage.setItem('depot_last_saved', new Date().toISOString());
      setLastSavedTime(new Date());

      const current = unitsRef.current.find((u) => u.id === activeUnitIdRef.current);
      if (current) {
        autoSaveUnitToCloud(current, reason);
      } else if (!isFirestoreQuotaExhausted()) {
        syncAllUnitsToFirestore(unitsRef.current).catch(() => {});
      }
    } catch (err) {
      console.warn('Auto-save encountered an issue:', err);
    }
  }, [autoSaveUnitToCloud]);

  // Window unload backup (Local storage only, 0 network quota used)
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveAllUnits(unitsRef.current);
      setActiveUnitId(activeUnitIdRef.current);
      localStorage.setItem('depot_last_saved', new Date().toISOString());
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleManualSave = useCallback(async () => {
    setIsManualSaving(true);
    setSyncStatus('syncing');
    try {
      saveAllUnits(unitsRef.current);
      setActiveUnitId(activeUnitIdRef.current);
      localStorage.setItem('depot_active_step', activeStepRef.current);
      localStorage.setItem('depot_last_saved', new Date().toISOString());
      setLastSavedTime(new Date());

      // If quota is not exhausted and online, sync to Firestore
      if (!isFirestoreQuotaExhausted() && typeof navigator !== 'undefined' && navigator.onLine) {
        const ok = await syncAllUnitsToFirestore(unitsRef.current);
        if (ok) {
          setSyncStatus('cloud_synced');
          setAutoSaveToast({ message: `Full Fleet (${unitsRef.current.length} units) Synced to Cloud`, timestamp: Date.now() });
        } else {
          setSyncStatus('offline_mode');
        }
      } else {
        setSyncStatus('offline_mode');
      }
      audioAlert.playClick();
    } catch (err) {
      console.warn('Manual save encountered an issue:', err);
      setSyncStatus('offline_mode');
    } finally {
      setTimeout(() => setIsManualSaving(false), 600);
      setTimeout(() => {
        setAutoSaveToast((curr) => (curr && Date.now() - curr.timestamp >= 2800 ? null : curr));
      }, 3000);
    }
  }, []);

  // Persist units in local storage and auto-save every time a process is marked as completed
  const handleUpdateUnit = useCallback((
    updater: (prev: ServiceUnit) => ServiceUnit,
    logAction?: string,
    targetUnitId?: string
  ) => {
    const matchId = targetUnitId || activeUnitId;
    let targetUpdatedUnit: ServiceUnit | null = null;
    let completedStageDetected: string | null = null;

    const currentUnits = unitsRef.current;
    const now = new Date().toISOString();

    const nextUnits = currentUnits.map((u) => {
      if (u.id !== matchId) return u;

      const updated = updater(u);

      // Check if any process step was marked as completed during this update
      for (const step of STEP_SEQUENCE) {
        const wasDone = checkUnitStepCompleted(step, u);
        const isDone = checkUnitStepCompleted(step, updated);
        if (!wasDone && isDone) {
          completedStageDetected = `Stage ${step.replace('_', ' ').toUpperCase()}`;
          break;
        }
      }

      // Also check if overall status became completed
      if (!completedStageDetected && updated.overallStatus === 'completed' && u.overallStatus !== 'completed') {
        completedStageDetected = 'Overall Overhaul Process';
      }

      // If an action was performed, log it in real-time
      if (logAction) {
        const logEntry: ActivityEntry = {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: now,
          stepId: activeStep,
          user: updated.intake?.technician || 'Technician',
          action: logAction,
        };
        updated.activityLog = [...(updated.activityLog || []), logEntry];
        if (!completedStageDetected && (
          logAction.toLowerCase().includes('completed') || 
          logAction.toLowerCase().includes('signed off') || 
          logAction.toLowerCase().includes('concluded') ||
          logAction.toLowerCase().includes('approved') ||
          logAction.toLowerCase().includes('bypassed') ||
          logAction.toLowerCase().includes('skipped')
        )) {
          completedStageDetected = logAction;
        }
      }

      updated.updatedAt = now;
      targetUpdatedUnit = updated;
      return updated;
    });

    // Synchronously persist to ref and local depot storage immediately
    unitsRef.current = nextUnits;
    saveAllUnits(nextUnits);
    setUnits(nextUnits);

    // Save only when pressing buttons (stage completion, action logs, manual save), NOT when typing!
    if (targetUpdatedUnit && completedStageDetected) {
      autoSaveUnitToCloud(targetUpdatedUnit, `${completedStageDetected} Completed`);
    } else if (targetUpdatedUnit && logAction) {
      // Button-triggered action with explicit log action message
      autoSaveUnitToCloud(targetUpdatedUnit, logAction);
    }
  }, [activeUnitId, activeStep, autoSaveUnitToCloud]);

  const handleSelectUnit = (id: string) => {
    setUnitId(id);
    setActiveUnitId(id);
    const targetUnit = units.find((u) => u.id === id);
    if (targetUnit && !isStepAccessible(activeStep, targetUnit)) {
      setActiveStep(
        targetUnit.currentStepId && isStepAccessible(targetUnit.currentStepId, targetUnit)
          ? targetUnit.currentStepId
          : 'intake'
      );
    }
  };

  const handleCreateUnit = async (newUnit: ServiceUnit) => {
    const nextUnits = [newUnit, ...unitsRef.current.filter((u) => u.id !== newUnit.id)];
    unitsRef.current = nextUnits;
    activeUnitIdRef.current = newUnit.id;
    setUnits(nextUnits);
    saveAllUnits(nextUnits);
    setUnitId(newUnit.id);
    setActiveUnitId(newUnit.id);
    setActiveStep('intake');
    setCurrentView('workflow');

    // Automatically save new intake to Cloud Firestore
    await autoSaveUnitToCloud(newUnit, `New Intake ${newUnit.serialNumber}`);
  };

  const handleOpenUnitWorkflow = (unitId: string, stepId?: StepId) => {
    handleSelectUnit(unitId);
    const targetUnit = units.find((u) => u.id === unitId) || activeUnit;
    if (stepId && isStepAccessible(stepId, targetUnit)) {
      setActiveStep(stepId);
    } else if (targetUnit?.currentStepId && isStepAccessible(targetUnit.currentStepId, targetUnit)) {
      setActiveStep(targetUnit.currentStepId);
    } else {
      setActiveStep('intake');
    }
    setCurrentView('workflow');
  };

  const handleOpenCertForUnit = (unit: ServiceUnit) => {
    setCertUnit(unit);
    setIsCertOpen(true);
  };

  const handleOpenUnitQrModal = (unitToInspect: ServiceUnit) => {
    setQrModalUnit(unitToInspect);
    setIsUnitQrModalOpen(true);
  };

  const handleConfirmScannedIntake = (
    scannedData: ScannedUnitPayload,
    existingUnit?: ServiceUnit
  ) => {
    const isRepeat = existingUnit !== undefined || scannedData.isFirstService === false;
    const newWo = `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const previousLife = scannedData.lifeNumber ?? existingUnit?.lifeNumber ?? (isRepeat ? 1 : 1);
    const nextLife = isRepeat ? previousLife + 1 : 1;

    // Auto-update unit type based on QR code reading
    const compType: ComponentType = scannedData.componentType || existingUnit?.componentType || 'heat_exchanger';

    const defaultModel = compType === 'water_radiator'
      ? 'F1 High-Efficiency Water Radiator'
      : compType === 'oil_cooler'
      ? 'F1 High-Pressure Oil Cooler Assembly'
      : compType === 'intercooler'
      ? 'Turbocharged Charge Air Cooler (Intercooler)'
      : compType === 'combi_3_unit'
      ? 'Triple-Circuit Combi Multi-Core Exchanger'
      : compType === 'combi_2_unit'
      ? 'Dual-Circuit Combi Multi-Core Exchanger'
      : 'Motorsport Performance Heat Exchanger';

    const defaultPartNo = compType === 'oil_cooler'
      ? 'FMU-7204-OC'
      : compType === 'water_radiator'
      ? 'RAD-2026-F1'
      : compType === 'intercooler'
      ? 'CAC-990-HP'
      : compType === 'combi_2_unit'
      ? 'CMB2-880-DUAL'
      : compType === 'combi_3_unit'
      ? 'CMB3-990-TRIP'
      : 'FMU-7200-SER';

    const finalCustomer = scannedData.customerName || existingUnit?.customerName || 'Scuderia Ferrari HP';

    const newUnit = createNewUnit({
      serialNumber: scannedData.serialNumber.trim(),
      lifeNumber: nextLife,
      componentType: compType,
      partNumber: scannedData.partNumber || existingUnit?.partNumber || defaultPartNo,
      modelName: scannedData.modelName || existingUnit?.modelName || defaultModel,
      customerName: finalCustomer,
      racingCategory: scannedData.racingCategory || existingUnit?.racingCategory || 'formula1',
      racingType: scannedData.racingType || existingUnit?.racingType || undefined,
      chassisNumber: scannedData.chassisNumber || existingUnit?.chassisNumber || undefined,
      workOrderNumber: newWo,
      technician: 'N. Malgarotti',
      isFirstService: !isRepeat,
      serviceType: isRepeat ? 'routine_overhaul' : 'first_time_assembly',
      hoursInOperation: (existingUnit?.intake.hoursInOperation || 0) + (isRepeat ? 650 : 0),
      comments: existingUnit
        ? `Initiated repeat service overhaul (Life #${nextLife}) via QR Code scan of previous record (${existingUnit.workOrderNumber}).`
        : `Registered new intake sheet (Life #${nextLife}) from scanned QR asset tag. Unit type auto-updated to ${compType}. Customer: ${finalCustomer}.`,
    });

    const nextUnits = [newUnit, ...unitsRef.current.filter((u) => u.id !== newUnit.id)];
    unitsRef.current = nextUnits;
    activeUnitIdRef.current = newUnit.id;
    setUnits(nextUnits);
    saveAllUnits(nextUnits);
    setUnitId(newUnit.id);
    setActiveUnitId(newUnit.id);
    setActiveStep('intake');
    setCurrentView('workflow');
    setIsQrScannerOpen(false);

    // Automatically save scanned intake to Cloud Firestore
    autoSaveUnitToCloud(newUnit, `Scanned Intake ${newUnit.serialNumber}`);
  };

  const handleUpdateUnitType = (unitId: string, newType: ComponentType) => {
    setUnits((prev) => {
      const next = prev.map((u) => {
        if (u.id !== unitId) return u;
        return {
          ...u,
          componentType: newType,
          intake: {
            ...u.intake,
            componentType: newType,
          },
        };
      });
      saveAllUnits(next);
      return next;
    });
  };

  const handleRefreshFleet = useCallback(() => {
    const refreshed = loadAllUnits();
    setUnits([...refreshed]);
    if (soundOn) {
      audioAlert.playClick();
    }
  }, [soundOn]);

  const handleOpenDeleteModal = (unit: ServiceUnit) => {
    setUnitToDelete(unit);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteUnit = async (unitId: string, _reason?: string) => {
    const remaining = deleteUnitFromStorage(unitId);
    const finalUnits = remaining;
    saveAllUnits(finalUnits);

    if (activeUnitId === unitId) {
      const nextActive = finalUnits[0] || null;
      if (nextActive) {
        setUnitId(nextActive.id);
        setActiveUnitId(nextActive.id);
        setActiveStep(nextActive.currentStepId || 'intake');
        setCertUnit(nextActive);
        setWorkbenchUnit(nextActive);
        setQrModalUnit(nextActive);
      } else {
        setUnitId('');
        setActiveUnitId('');
        setCertUnit(null);
        setWorkbenchUnit(null);
        setQrModalUnit(null);
      }
    }

    // Immediately refresh state and close modal
    setUnits([...finalUnits]);
    setIsDeleteModalOpen(false);
    setUnitToDelete(null);

    // Safely notify Firestore without throwing
    deleteUnitFromFirestore(unitId).catch((err) => {
      console.warn('Failed to delete unit from Firestore:', err);
    });

    if (soundOn) {
      audioAlert.playClick();
    }
  };

  // Step sequence
  const stepSequence: StepId[] = STEP_SEQUENCE;

  const isIntercooler = activeUnit
    ? (activeUnit.componentType === 'intercooler' || activeUnit.intake?.componentType === 'intercooler')
    : false;

  const isStepRequired = (stepId: StepId): boolean => {
    if (!activeUnit) return true;
    const isIntercoolerUnit = activeUnit.componentType === 'intercooler' || activeUnit.intake?.componentType === 'intercooler';
    switch (stepId) {
      case 'intake':
        return true;
      case 'degreasing':
        return activeUnit.processConfig?.degreasingRequired !== false && activeUnit.degreasing?.skipped !== true;
      case 'first_flush':
        return activeUnit.processConfig?.firstFlushRequired !== false;
      case 'flow_test':
        return !isIntercoolerUnit && activeUnit.processConfig?.flowTestRequired !== false && !activeUnit.flowTest?.isExempt;
      case 'pressure_test':
        return activeUnit.processConfig?.pressureTestRequired !== false;
      case 'cleaning':
        return (
          activeUnit.processConfig?.cleaningRequired !== false && 
          activeUnit.processConfig?.descalingRequired !== false && 
          activeUnit.cleaning?.skipped !== true
        );
      case 'final_flush':
        return activeUnit.processConfig?.finalFlushRequired !== false;
      case 'oven':
        return activeUnit.processConfig?.ovenRequired !== false;
      case 'gilling':
        return activeUnit.processConfig?.gillingRequired !== false;
      case 'sign_off':
        return true;
      default:
        return true;
    }
  };

  const isStepCompleted = (stepId: StepId, u: ServiceUnit | null = activeUnit): boolean => {
    return checkUnitStepCompleted(stepId, u);
  };

  const isStepAccessible = (targetStepId: StepId, unitToCheck: ServiceUnit | null = activeUnit): boolean => {
    if (!unitToCheck) return false;
    if (targetStepId === activeStep && unitToCheck === activeUnit) return true;

    const targetIndex = stepSequence.indexOf(targetStepId);
    if (targetIndex < 0) return false;
    if (targetIndex === 0) return true; // Intake is always accessible

    // Check all prior steps: cannot access if ANY prior required step is not completed
    for (let i = 0; i < targetIndex; i++) {
      const priorStep = stepSequence[i];
      if (isStepRequired(priorStep) && !isStepCompleted(priorStep, unitToCheck)) {
        return false;
      }
    }
    return true;
  };

  const handleNextStep = (targetStepOverride?: StepId | unknown, completedStepOverride?: StepId | unknown) => {
    if (!activeUnit) return;

    const latestUnit = unitsRef.current.find((u) => u.id === activeUnit.id) || activeUnit;
    const explicitTarget = typeof targetStepOverride === 'string' && targetStepOverride.length > 0 ? (targetStepOverride as StepId) : undefined;
    const explicitCompleted = typeof completedStepOverride === 'string' && completedStepOverride.length > 0 ? (completedStepOverride as StepId) : undefined;
    const isExplicitCompletion = Boolean(explicitCompleted || explicitTarget);

    // If step is required, only block if neither override was passed and current latest unit step is truly incomplete
    if (!isExplicitCompletion && isStepRequired(activeStep) && !isStepCompleted(activeStep, latestUnit)) {
      // Re-verify against latestUnit to avoid stale closure block
      const isActuallyDone = (() => {
        switch (activeStep) {
          case 'intake': return !!latestUnit.intake?.completedAt;
          case 'degreasing': return !!latestUnit.degreasing?.completedAt || latestUnit.degreasing?.skipped === true || latestUnit.processConfig?.degreasingRequired === false;
          case 'cleaning': return !!latestUnit.cleaning?.completedAt || latestUnit.cleaning?.skipped === true || latestUnit.processConfig?.cleaningRequired === false || latestUnit.processConfig?.descalingRequired === false;
          case 'first_flush': return !!latestUnit.firstFlush?.completedAt || latestUnit.processConfig?.firstFlushRequired === false;
          case 'flow_test': return !!latestUnit.flowTest?.completedAt || latestUnit.flowTest?.isExempt === true || latestUnit.processConfig?.flowTestRequired === false;
          case 'pressure_test': return (latestUnit.pressureTest?.testResult === 'PASS' || !!latestUnit.pressureTest?.completedAt) || latestUnit.processConfig?.pressureTestRequired === false;
          case 'final_flush': return !!latestUnit.finalFlush?.completedAt || latestUnit.processConfig?.finalFlushRequired === false;
          case 'oven': return !!latestUnit.oven?.completedAt || latestUnit.processConfig?.ovenRequired === false;
          case 'gilling': return !!latestUnit.gilling?.completedAt || latestUnit.processConfig?.gillingRequired === false;
          case 'sign_off': return !!latestUnit.signOff?.completedAt || latestUnit.overallStatus === 'completed';
          default: return true;
        }
      })();

      if (!isActuallyDone) {
        if (soundOn) audioAlert.playWarning();
        setAutoSaveToast({
          message: `Stage ${activeStep.toUpperCase()} is required. Please complete or bypass this stage before proceeding.`,
          timestamp: Date.now(),
        });
        return;
      }
    }

    const currentIndex = stepSequence.indexOf(activeStep);
    let nextIndex = currentIndex + 1;

    if (explicitTarget) {
      const explicitIdx = stepSequence.indexOf(explicitTarget);
      if (explicitIdx >= 0) nextIndex = explicitIdx;
    } else {
      // Advance to next required step (skipping only those steps explicitly bypassed or not required)
      while (nextIndex < stepSequence.length && !isStepRequired(stepSequence[nextIndex])) {
        nextIndex += 1;
      }
    }

    if (nextIndex < stepSequence.length) {
      const nextStep = stepSequence[nextIndex];
      setActiveStep(nextStep);
      activeStepRef.current = nextStep;
      localStorage.setItem('depot_active_step', nextStep);

      // Synchronously update currentStepId in unitsRef and local storage
      const currentList = unitsRef.current;
      const nextUnits = currentList.map((u) => {
        if (u.id !== activeUnit.id) return u;
        return {
          ...u,
          currentStepId: nextStep,
          updatedAt: new Date().toISOString(),
        };
      });
      unitsRef.current = nextUnits;
      saveAllUnits(nextUnits);
      setUnits(nextUnits);

      performAutoSave(`Advanced to Stage ${nextStep.toUpperCase()}`);
    }
  };

  const handlePrevStep = () => {
    if (!activeUnit) return;
    const currentIndex = stepSequence.indexOf(activeStep);
    let prevIndex = currentIndex - 1;

    // Skip back past steps that were not required
    while (prevIndex >= 0 && !isStepRequired(stepSequence[prevIndex])) {
      prevIndex -= 1;
    }

    if (prevIndex >= 0) {
      const prevStep = stepSequence[prevIndex];
      setActiveStep(prevStep);
      performAutoSave(`Returned to Stage ${prevStep.toUpperCase()}`);
    }
  };

  const unreadLogs = Math.max(0, (activeUnit?.activityLog?.length || 0) - lastViewedLogCount);

  const handleOpenAuditLog = () => {
    setIsAuditLogOpen(true);
    setLastViewedLogCount(activeUnit?.activityLog?.length || 0);
  };

  // Dedicated Welcome Screen & Login Gate: Render Welcome Page before accessing the app
  if (!hasEnteredApp || !profile) {
    return (
      <>
        <WelcomeScreen
          units={units}
          onEnterApp={({ targetStep, targetUnitId } = {}) => {
            setHasEnteredApp(true);
            try {
              sessionStorage.setItem('depot_has_entered_app', 'true');
            } catch {}
            if (targetStep) {
              setActiveStep(targetStep);
              setCurrentView('workflow');
            }
            if (targetUnitId) {
              setUnitId(targetUnitId);
            }
          }}
          onOpenStageQrModal={() => setIsStageQrModalOpen(true)}
        />
        <StageQrPlacardsModal
          isOpen={isStageQrModalOpen}
          onClose={() => setIsStageQrModalOpen(false)}
          activeStep={activeStep}
          onSelectStage={(stepId) => {
            setActiveStep(stepId);
            setCurrentView('workflow');
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0e12] text-neutral-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden max-w-full w-full">
      {/* Top Application Header */}
      <Header
        unit={activeUnit}
        units={visibleUnits}
        onSelectUnit={handleSelectUnit}
        onOpenNewUnitModal={() => {
          setScannedInitialData(null);
          setIsNewUnitModalOpen(true);
        }}
        onOpenActivityLog={handleOpenAuditLog}
        onOpenCertificate={() => handleOpenCertForUnit(activeUnit)}
        onOpenWorkbenchSheet={() => handleOpenCertForUnit(activeUnit)}
        onOpenQrScanner={() => setIsQrScannerOpen(true)}
        onOpenStageQrModal={() => setIsStageQrModalOpen(true)}
        onOpenUnitQrModal={handleOpenUnitQrModal}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onDeleteUnit={isCustomer ? undefined : handleOpenDeleteModal}
        onRefreshFleet={handleRefreshFleet}
        unreadLogCount={unreadLogs}
        currentView={currentView}
        onViewChange={setCurrentView}
        onPromptTechnicianLogin={handlePromptTechnicianLogin}
        onOpenWelcomeScreen={() => {
          setHasEnteredApp(false);
          try {
            sessionStorage.removeItem('depot_has_entered_app');
          } catch {}
        }}
        soundOn={soundOn}
        toggleSound={toggleSound}
        syncStatus={syncStatus}
        isAutoSaving={isManualSaving}
        lastAutoSaveTime={lastSavedTime}
        onManualSave={handleManualSave}
      />

      {/* Conditional View: Dashboard vs Customer Portal vs Service Analytics vs Daily Quota vs Interactive Stage Workflow */}
      {currentView === 'customer_portal' ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
          <CustomerPortalView
            units={visibleUnits}
            onOpenCertificateModal={handleOpenCertForUnit}
            onOpenDeliveryModal={(u) => {
              setDeliveryUnit(u);
              setIsDeliveryModalOpen(true);
            }}
            onPromptTechnicianLogin={() => handlePromptTechnicianLogin('Sign in as workshop technician to access overhaul stages, calibrate test benches, or view internal telemetry.')}
            onBackToDepot={() => setCurrentView('dashboard')}
          />
        </main>
      ) : currentView === 'dashboard' ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
          <Dashboard
            units={visibleUnits}
            activeUnit={activeUnit}
            onSelectUnit={handleSelectUnit}
            onOpenUnitWorkflow={handleOpenUnitWorkflow}
            onOpenNewUnitModal={() => {
              setScannedInitialData(null);
              setIsNewUnitModalOpen(true);
            }}
            onOpenCertificate={handleOpenCertForUnit}
            onOpenQrScanner={() => setIsQrScannerOpen(true)}
            onOpenUnitQrModal={handleOpenUnitQrModal}
            onUpdateUnit={handleUpdateUnit}
            onOpenAnalytics={() => {
              if (!isAssignedPerson) {
                handlePromptTechnicianLogin('Service Analytics is restricted to assigned workshop technicians and lead engineers. Please authenticate.');
                return;
              }
              setCurrentView('analytics');
            }}
            onOpenQuota={() => {
              if (!isAssignedPerson) {
                handlePromptTechnicianLogin('Cloud Firestore Daily Quota and system metrics are restricted to assigned service technicians. Please authenticate.');
                return;
              }
              setCurrentView('quota');
            }}
            onDeleteUnit={handleOpenDeleteModal}
            onRefreshFleet={handleRefreshFleet}
          />
        </main>
      ) : currentView === 'analytics' ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
          {!isAssignedPerson ? (
            <div className="max-w-md mx-auto my-12 p-8 bg-neutral-900 border border-neutral-800 rounded-2xl text-center space-y-4 shadow-xl">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <Lock className="h-7 w-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-neutral-100">
                  Restricted: Assigned Service Personnel Only
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Service Analytics and workshop speed metrics are confidential operations restricted to assigned depot service technicians and lead engineers.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePromptTechnicianLogin('Service Analytics is restricted to assigned service technicians. Please sign in.')}
                  className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Prompt Technician Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('dashboard')}
                  className="w-full sm:w-auto px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-700 transition-colors cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <ServiceAnalyticsView
              units={units}
              onSelectUnit={handleSelectUnit}
              onOpenUnitWorkflow={handleOpenUnitWorkflow}
              onOpenCertificate={handleOpenCertForUnit}
            />
          )}
        </main>
      ) : currentView === 'quota' ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
          {!isAssignedPerson ? (
            <div className="max-w-md mx-auto my-12 p-8 bg-neutral-900 border border-neutral-800 rounded-2xl text-center space-y-4 shadow-xl">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <Lock className="h-7 w-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-neutral-100">
                  Restricted: Assigned Service Personnel Only
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Cloud Firestore Daily Quota, read/write counters, and circuit breaker telemetry are restricted to assigned depot service technicians.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePromptTechnicianLogin('Cloud Daily Quota is restricted to assigned service technicians. Please sign in.')}
                  className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Prompt Technician Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('dashboard')}
                  className="w-full sm:w-auto px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-700 transition-colors cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <DailyQuotaView
              units={units}
              onRefreshFleet={handleRefreshFleet}
            />
          )}
        </main>
      ) : !activeUnit ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 flex items-center justify-center">
          <div className="py-16 px-6 text-center max-w-md mx-auto space-y-4 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl my-12">
            <div className="h-16 w-16 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center mx-auto text-amber-400 shadow-md">
              <Cloud className="h-8 w-8 text-neutral-500" />
            </div>
            <div className="space-y-1.5 font-sans">
              <h3 className="text-lg font-bold text-white">No Active Units in Fleet</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                The unit fleet list is currently empty. Register a new intake to begin step-by-step workflow tracking.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setScannedInitialData(null);
                  setIsNewUnitModalOpen(true);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
              >
                + New Intake
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('dashboard')}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-700 transition-colors cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </main>
      ) : isCustomer ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
          <CustomerProcessMapView
            unit={activeUnit}
            units={visibleUnits}
            onSelectUnit={handleSelectUnit}
            onOpenCertificate={handleOpenCertForUnit}
            onBackToDashboard={() => setCurrentView('dashboard')}
          />
        </main>
      ) : (
        <>
          {/* Visual Workflow Pipeline Stepper */}
          <PipelineNav
            unit={activeUnit}
            activeStep={activeStep}
            onSelectStep={(step) => {
              if (!isStepAccessible(step)) {
                if (soundOn) audioAlert.playWarning();
                return;
              }
              setActiveStep(step);
              performAutoSave(`Navigated to Stage ${step.toUpperCase()}`);
            }}
            onOpenStageQrModal={() => setIsStageQrModalOpen(true)}
          />

          {/* Main Process Stage Workspace */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
            {activeStep === 'intake' && (
              <IntakeStep
                unit={activeUnit}
                onUpdateUnit={handleUpdateUnit}
                onNextStep={handleNextStep}
                onOpenQrModal={() => handleOpenUnitQrModal(activeUnit)}
                onOpenScanner={() => setIsQrScannerOpen(true)}
                onOpenWorkbenchSheet={() => handleOpenCertForUnit(activeUnit)}
                onDeleteUnit={() => handleOpenDeleteModal(activeUnit)}
              />
            )}

            {activeStep === 'degreasing' && (
              <DegreasingStep
                unit={activeUnit}
                onUpdateUnit={handleUpdateUnit}
                onNextStep={handleNextStep}
                onPrevStep={handlePrevStep}
                onOpenScanner={() => setIsQrScannerOpen(true)}
              />
            )}

            {activeStep === 'descaling' && (
              <DescalingStep
                unit={activeUnit}
                onUpdateUnit={handleUpdateUnit}
                onNextStep={handleNextStep}
                onPrevStep={handlePrevStep}
                onOpenScanner={() => setIsQrScannerOpen(true)}
              />
            )}

            {activeStep === 'first_flush' && (
              <FirstFlushStep
                unit={activeUnit}
                onUpdateUnit={handleUpdateUnit}
                onNextStep={handleNextStep}
                onPrevStep={handlePrevStep}
                onOpenScanner={() => setIsQrScannerOpen(true)}
              />
            )}

            {activeStep === 'flow_test' && (
              <FlowTestingStep
                unit={activeUnit}
                allUnits={units}
                onUpdateUnit={handleUpdateUnit}
                onNextStep={handleNextStep}
                onPrevStep={handlePrevStep}
                onOpenScanner={() => setIsQrScannerOpen(true)}
              />
            )}

            {activeStep === 'pressure_test' && (
              <PressureTestingStep
                unit={activeUnit}
                onUpdateUnit={handleUpdateUnit}
                onNextStep={handleNextStep}
                onPrevStep={handlePrevStep}
                onOpenScanner={() => setIsQrScannerOpen(true)}
              />
            )}

            {activeStep === 'cleaning' && (
              <CleaningStep
                unit={activeUnit}
                onUpdateUnit={handleUpdateUnit}
                onNextStep={handleNextStep}
                onPrevStep={handlePrevStep}
                onOpenScanner={() => setIsQrScannerOpen(true)}
              />
            )}

            {activeStep === 'final_flush' && (
              <FinalFlushStep
                unit={activeUnit}
                onUpdateUnit={handleUpdateUnit}
                onNextStep={handleNextStep}
                onPrevStep={handlePrevStep}
                onOpenScanner={() => setIsQrScannerOpen(true)}
              />
            )}

            {activeStep === 'oven' && (
              <OvenStep
                unit={activeUnit}
                onUpdateUnit={handleUpdateUnit}
                onNextStep={handleNextStep}
                onPrevStep={handlePrevStep}
                onOpenScanner={() => setIsQrScannerOpen(true)}
              />
            )}

            {activeStep === 'gilling' && (
              <GillingStep
                unit={activeUnit}
                onUpdateUnit={handleUpdateUnit}
                onNextStep={handleNextStep}
                onPrevStep={handlePrevStep}
                onOpenScanner={() => setIsQrScannerOpen(true)}
              />
            )}

            {activeStep === 'sign_off' && (
              <SignOffStep
                unit={activeUnit}
                onUpdateUnit={handleUpdateUnit}
                onOpenCertificate={() => handleOpenCertForUnit(activeUnit)}
                onPrevStep={handlePrevStep}
                onOpenScanner={() => setIsQrScannerOpen(true)}
              />
            )}
          </main>
        </>
      )}

      {/* Real-time Audit Stream Drawer */}
      <AuditLogDrawer
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
        logs={activeUnit?.activityLog || []}
        unitSerialNumber={activeUnit?.serialNumber || 'N/A'}
      />

      {/* Conformance Certificate Modal */}
      {certUnit && (
        <CertificateModal
          unit={certUnit}
          isOpen={isCertOpen}
          onClose={() => setIsCertOpen(false)}
          onUpdateUnit={handleUpdateUnit}
        />
      )}

      {/* New Unit Intake Registration Modal */}
      <NewUnitModal
        isOpen={isNewUnitModalOpen}
        onClose={() => {
          setIsNewUnitModalOpen(false);
          setScannedInitialData(null);
        }}
        onCreateUnit={handleCreateUnit}
        onOpenScanner={() => setIsQrScannerOpen(true)}
        initialData={scannedInitialData}
      />

      {/* QR Code Live Scanner Modal */}
      <QrCodeScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        units={visibleUnits}
        currentStepId={activeStep}
        activeUnitId={activeUnit?.id || ''}
        onConfirmNewIntake={handleConfirmScannedIntake}
        onSelectExistingUnit={(unitId, targetStep) => handleOpenUnitWorkflow(unitId, targetStep)}
        onUpdateActiveUnitType={handleUpdateUnitType}
        onSelectStage={(stepId) => {
          setActiveStep(stepId);
          setCurrentView('workflow');
        }}
      />

      {/* Process Stage Station QR Placards Modal */}
      <StageQrPlacardsModal
        isOpen={isStageQrModalOpen}
        onClose={() => setIsStageQrModalOpen(false)}
        activeStep={activeStep}
        onSelectStage={(stepId) => {
          setActiveStep(stepId);
          setCurrentView('workflow');
        }}
      />

      {/* Unit QR Asset Tag Label & Printing Modal */}
      {qrModalUnit && (
        <UnitQrLabelModal
          unit={qrModalUnit}
          isOpen={isUnitQrModalOpen}
          onClose={() => setIsUnitQrModalOpen(false)}
          onScanForNewIntake={(unitToReIntake) => {
            handleConfirmScannedIntake(
              {
                serialNumber: unitToReIntake.serialNumber,
                partNumber: unitToReIntake.partNumber,
                modelName: unitToReIntake.modelName,
                customerName: unitToReIntake.customerName,
                isFirstService: false,
                id: unitToReIntake.id,
              },
              unitToReIntake
            );
          }}
        />
      )}

      {/* Bicester Workbench Check-In & Quality Validation Sheet Modal (PS-WORKBENCH-QA-2026) */}
      {workbenchUnit && (
        <WorkbenchSheetModal
          unit={workbenchUnit}
          isOpen={isWorkbenchSheetOpen}
          onClose={() => setIsWorkbenchSheetOpen(false)}
          onUpdateUnit={handleUpdateUnit}
        />
      )}

      {/* Depot Engineer Authentication & Cloud Firestore Sync Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Delete Unit (Input Error Purge) Modal */}
      <DeleteUnitModal
        unit={unitToDelete}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmDelete={handleConfirmDeleteUnit}
      />

      {/* Service Technician Login Prompt Modal */}
      <ServiceTechnicianLoginModal
        isOpen={isTechLoginModalOpen}
        onClose={() => setIsTechLoginModalOpen(false)}
        onSwitchToCustomerPortal={() => {
          setIsTechLoginModalOpen(false);
          setCurrentView('customer_portal');
        }}
        reason={techLoginReason}
      />

      {/* Dispatch & Delivery Tracking Modal */}
      {deliveryUnit && (
        <DeliveryTrackingModal
          unit={deliveryUnit}
          isOpen={isDeliveryModalOpen}
          onClose={() => setIsDeliveryModalOpen(false)}
          onUpdateUnit={handleUpdateUnit}
        />
      )}

      {/* Application Persistent Footer (In-flow, never floats on top of content or blocks UI buttons) */}
      <footer className="mt-auto border-t border-neutral-800/80 bg-neutral-950/80 px-4 lg:px-8 py-3 text-xs text-neutral-400 no-print app-footer print:hidden print-hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-neutral-400 flex-wrap">
            <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            <span className="font-mono text-[11px] text-neutral-300 font-semibold">Particle Science Workshop Tracking</span>
            <span className="text-neutral-600">·</span>
            <span className="text-neutral-400">Bicester Depot Quality System</span>
            <span className="text-neutral-600">·</span>
            <span className="font-mono text-[11px] text-amber-400">Unit: {activeUnit ? activeUnit.serialNumber : 'None (Empty Fleet)'}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="hover:text-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Cloud Firestore Database & Authentication"
            >
              <Cloud className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-mono text-[11px]">Firestore Online</span>
            </button>
            <span className="text-neutral-700">|</span>
            <button
              onClick={handleOpenAuditLog}
              className="hover:text-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Open QA Activity Audit Stream"
            >
              <History className="h-3.5 w-3.5 text-sky-400" />
              <span>Audit Stream ({activeUnit?.activityLog?.length || 0})</span>
            </button>
            <span className="text-neutral-700">|</span>
            <button
              onClick={toggleSound}
              className="hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title={soundOn ? 'Mute Audio Alerts' : 'Enable Audio Alerts'}
            >
              {soundOn ? <Volume2 className="h-3.5 w-3.5 text-amber-400" /> : <VolumeX className="h-3.5 w-3.5 text-neutral-500" />}
              <span>Sound: {soundOn ? 'Active' : 'Muted'}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Cloud Auto-Save Floating Notification */}
      {autoSaveToast && (
        <div className="fixed bottom-14 right-4 sm:right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-neutral-900/95 border border-emerald-500/40 text-emerald-300 shadow-2xl backdrop-blur-md animate-fadeIn no-print max-w-[90vw]">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold tracking-wide truncate">{autoSaveToast.message}</span>
        </div>
      )}
    </div>
  );
}
