import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Play, 
  Pause, 
  AlertTriangle, 
  CheckCircle2, 
  Bell, 
  BellRing, 
  ArrowRight, 
  Layers, 
  Flame, 
  Droplets, 
  Wind, 
  RotateCcw, 
  Sparkles, 
  Compass, 
  Volume2, 
  VolumeX, 
  ExternalLink,
  Check,
  History
} from 'lucide-react';
import { ServiceUnit, StepId } from '../types/process';
import { getTeamMetadata } from '../constants/motorsport';
import { getPriorityConfig } from '../utils/priority';
import { subscribeToTimerTicker } from '../utils/timerWorker';
import { audioAlert } from '../utils/audioAlert';

export interface ActiveTimerItem {
  id: string; // unique key
  unitId: string;
  serialNumber: string;
  customerName: string;
  stageId: StepId;
  stageName: string;
  timerName: string;
  badgeColor: string;
  remainingSeconds: number;
  targetSeconds: number;
  isRunning: boolean;
  isCompleted: boolean;
  targetEndTimestamp?: number;
  completedAt?: string;
  icon: 'droplets' | 'flame' | 'clock' | 'sparkles' | 'wind';
}

interface DashboardTimersConsoleProps {
  units: ServiceUnit[];
  onOpenUnitWorkflow: (unitId: string, stepId?: StepId) => void;
  onUpdateUnit?: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string, targetUnitId?: string) => void;
}

export const DashboardTimersConsole: React.FC<DashboardTimersConsoleProps> = ({
  units,
  onOpenUnitWorkflow,
  onUpdateUnit,
}) => {
  // Persisted state for acknowledged alerts in depot storage
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('depot_acknowledged_alerts');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showAcknowledgedHistory, setShowAcknowledgedHistory] = useState(false);

  // Background Unthrottled Ticker: re-renders every 1s across tabs
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsubscribe = subscribeToTimerTicker(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  // Scan all units for running or completed timers
  const { activeTimers, completedAlerts, acknowledgedAlertsList } = useMemo(() => {
    const now = Date.now();
    const runningList: ActiveTimerItem[] = [];
    const alertsList: ActiveTimerItem[] = [];
    const acknowledgedList: ActiveTimerItem[] = [];

    units.forEach((u) => {
      // 1. Degreasing: Oil Draining
      if (u.degreasing?.oilDraining) {
        const od = u.degreasing.oilDraining;
        const target = od.targetSeconds ?? 900;
        let rem = od.remainingSeconds ?? target;
        if (od.isRunning && od.targetEndTimestamp) {
          rem = Math.max(0, Math.ceil((od.targetEndTimestamp - now) / 1000));
        }
        const item: ActiveTimerItem = {
          id: `${u.id}-oil-drain`,
          unitId: u.id,
          serialNumber: u.serialNumber,
          customerName: u.customerName,
          stageId: 'degreasing',
          stageName: 'Degreasing · Phase 1',
          timerName: 'Oil Draining Dwell',
          badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
          remainingSeconds: rem,
          targetSeconds: target,
          isRunning: Boolean(od.isRunning),
          isCompleted: Boolean(od.timerCompleted || (od.isRunning && rem <= 0)),
          targetEndTimestamp: od.targetEndTimestamp,
          completedAt: od.completedAt,
          icon: 'droplets',
        };
        if (item.isRunning && rem > 0) runningList.push(item);
        if (item.isCompleted) {
          if (!acknowledgedAlerts[item.id]) alertsList.push(item);
          else acknowledgedList.push(item);
        }
      }

      // 2. Degreasing: Degrease Bath / Solvent Flow Soak
      if (u.degreasing?.soakTimer) {
        const st = u.degreasing.soakTimer;
        const target = st.targetSeconds ?? ((u.degreasing.soakDurationMinutes || 25) * 60);
        let rem = st.remainingSeconds ?? target;
        if (st.isRunning && st.targetEndTimestamp) {
          rem = Math.max(0, Math.ceil((st.targetEndTimestamp - now) / 1000));
        }
        const item: ActiveTimerItem = {
          id: `${u.id}-degrease-soak`,
          unitId: u.id,
          serialNumber: u.serialNumber,
          customerName: u.customerName,
          stageId: 'degreasing',
          stageName: 'Degreasing · Phase 2',
          timerName: 'Degrease Bath / Solvent Flow',
          badgeColor: 'border-sky-500/40 text-sky-300 bg-sky-500/10',
          remainingSeconds: rem,
          targetSeconds: target,
          isRunning: Boolean(st.isRunning),
          isCompleted: Boolean(st.timerCompleted || (st.isRunning && rem <= 0)),
          targetEndTimestamp: st.targetEndTimestamp,
          completedAt: st.completedAt,
          icon: 'droplets',
        };
        if (item.isRunning && rem > 0) runningList.push(item);
        if (item.isCompleted) {
          if (!acknowledgedAlerts[item.id]) alertsList.push(item);
          else acknowledgedList.push(item);
        }
      }

      // 3. First Flush: Port 1 Powerwash
      if (u.firstFlush?.phase1PowerwashPort1) {
        const p1 = u.firstFlush.phase1PowerwashPort1;
        const target = p1.targetSeconds ?? 120;
        let rem = p1.remainingSeconds ?? target;
        if (p1.isRunning && p1.targetEndTimestamp) {
          rem = Math.max(0, Math.ceil((p1.targetEndTimestamp - now) / 1000));
        }
        const item: ActiveTimerItem = {
          id: `${u.id}-ff-port1`,
          unitId: u.id,
          serialNumber: u.serialNumber,
          customerName: u.customerName,
          stageId: 'first_flush',
          stageName: 'First Flush (55°C)',
          timerName: 'Port 1 Powerwash (2m)',
          badgeColor: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
          remainingSeconds: rem,
          targetSeconds: target,
          isRunning: Boolean(p1.isRunning),
          isCompleted: Boolean(p1.timerCompleted || (p1.isRunning && rem <= 0)),
          targetEndTimestamp: p1.targetEndTimestamp,
          completedAt: p1.completedAt,
          icon: 'droplets',
        };
        if (item.isRunning && rem > 0) runningList.push(item);
        if (item.isCompleted) {
          if (!acknowledgedAlerts[item.id]) alertsList.push(item);
          else acknowledgedList.push(item);
        }
      }

      // 4. First Flush: Port 2 Powerwash
      if (u.firstFlush?.phase2PowerwashPort2) {
        const p2 = u.firstFlush.phase2PowerwashPort2;
        const target = p2.targetSeconds ?? 120;
        let rem = p2.remainingSeconds ?? target;
        if (p2.isRunning && p2.targetEndTimestamp) {
          rem = Math.max(0, Math.ceil((p2.targetEndTimestamp - now) / 1000));
        }
        const item: ActiveTimerItem = {
          id: `${u.id}-ff-port2`,
          unitId: u.id,
          serialNumber: u.serialNumber,
          customerName: u.customerName,
          stageId: 'first_flush',
          stageName: 'First Flush (55°C)',
          timerName: 'Port 2 Powerwash (2m)',
          badgeColor: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
          remainingSeconds: rem,
          targetSeconds: target,
          isRunning: Boolean(p2.isRunning),
          isCompleted: Boolean(p2.timerCompleted || (p2.isRunning && rem <= 0)),
          targetEndTimestamp: p2.targetEndTimestamp,
          completedAt: p2.completedAt,
          icon: 'droplets',
        };
        if (item.isRunning && rem > 0) runningList.push(item);
        if (item.isCompleted) {
          if (!acknowledgedAlerts[item.id]) alertsList.push(item);
          else acknowledgedList.push(item);
        }
      }

      // 5. First Flush: Desoaping Flush (6m water/intercooler or 10m oil)
      if (u.firstFlush?.phase3Desoaping) {
        const p3 = u.firstFlush.phase3Desoaping;
        const isOil = u.componentType === 'oil_cooler' || (typeof u.componentType === 'string' && u.componentType.includes('oil'));
        const target = p3.targetSeconds ?? (isOil ? 600 : 360);
        let rem = p3.remainingSeconds ?? target;
        if (p3.isRunning && p3.targetEndTimestamp) {
          rem = Math.max(0, Math.ceil((p3.targetEndTimestamp - now) / 1000));
        }
        const item: ActiveTimerItem = {
          id: `${u.id}-ff-desoaping`,
          unitId: u.id,
          serialNumber: u.serialNumber,
          customerName: u.customerName,
          stageId: 'first_flush',
          stageName: 'First Flush (55°C)',
          timerName: `Desoaping Flush (${Math.round(target / 60)}m)`,
          badgeColor: 'border-teal-500/40 text-teal-300 bg-teal-500/10',
          remainingSeconds: rem,
          targetSeconds: target,
          isRunning: Boolean(p3.isRunning),
          isCompleted: Boolean(p3.timerCompleted || (p3.isRunning && rem <= 0)),
          targetEndTimestamp: p3.targetEndTimestamp,
          completedAt: p3.completedAt,
          icon: 'sparkles',
        };
        if (item.isRunning && rem > 0) runningList.push(item);
        if (item.isCompleted) {
          if (!acknowledgedAlerts[item.id]) alertsList.push(item);
          else acknowledgedList.push(item);
        }
      }

      // 6. First Flush: Main Timer
      if (u.firstFlush?.isRunning) {
        const ff = u.firstFlush;
        const target = ff.targetDurationSeconds ?? 360;
        let rem = ff.remainingSeconds ?? target;
        if (ff.targetEndTimestamp) {
          rem = Math.max(0, Math.ceil((ff.targetEndTimestamp - now) / 1000));
        }
        if (rem > 0) {
          runningList.push({
            id: `${u.id}-ff-main`,
            unitId: u.id,
            serialNumber: u.serialNumber,
            customerName: u.customerName,
            stageId: 'first_flush',
            stageName: 'First Flush',
            timerName: '55°C DI Circulation',
            badgeColor: 'border-teal-500/40 text-teal-300 bg-teal-500/10',
            remainingSeconds: rem,
            targetSeconds: target,
            isRunning: true,
            isCompleted: false,
            targetEndTimestamp: ff.targetEndTimestamp,
            icon: 'droplets',
          });
        }
      }

      // 7. Final Flush Timer
      if (u.finalFlush) {
        const fl = u.finalFlush;
        const target = fl.targetSeconds ?? 300;
        let rem = fl.remainingSeconds ?? target;
        if (fl.isRunning && fl.targetEndTimestamp) {
          rem = Math.max(0, Math.ceil((fl.targetEndTimestamp - now) / 1000));
        }
        const item: ActiveTimerItem = {
          id: `${u.id}-final-flush`,
          unitId: u.id,
          serialNumber: u.serialNumber,
          customerName: u.customerName,
          stageId: 'final_flush',
          stageName: 'Final Flush (3μm)',
          timerName: 'Precision Fluid Filtration',
          badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
          remainingSeconds: rem,
          targetSeconds: target,
          isRunning: Boolean(fl.isRunning),
          isCompleted: Boolean(fl.timerCompleted || (fl.isRunning && rem <= 0)),
          targetEndTimestamp: fl.targetEndTimestamp,
          icon: 'droplets',
        };
        if (item.isRunning && rem > 0) runningList.push(item);
        if (item.isCompleted) {
          if (!acknowledgedAlerts[item.id]) alertsList.push(item);
          else acknowledgedList.push(item);
        }
      }

      // 8. Oven Thermal Bake Timer
      if (u.oven) {
        const ov = u.oven;
        const target = ov.targetSeconds || 7200;
        let rem = ov.remainingSeconds ?? target;
        if (ov.isRunning && ov.targetEndTimestamp) {
          rem = Math.max(0, Math.ceil((ov.targetEndTimestamp - now) / 1000));
        }
        const item: ActiveTimerItem = {
          id: `${u.id}-oven-bake`,
          unitId: u.id,
          serialNumber: u.serialNumber,
          customerName: u.customerName,
          stageId: 'oven',
          stageName: 'Oven Bake',
          timerName: `Thermal Bake (${ov.targetTempC || 80}°C)`,
          badgeColor: 'border-orange-500/40 text-orange-300 bg-orange-500/10',
          remainingSeconds: rem,
          targetSeconds: target,
          isRunning: Boolean(ov.isRunning),
          isCompleted: Boolean(ov.timerCompleted || (ov.isRunning && rem <= 0)),
          targetEndTimestamp: ov.targetEndTimestamp,
          completedAt: ov.completedAt,
          icon: 'flame',
        };
        if (item.isRunning && rem > 0) runningList.push(item);
        if (item.isCompleted) {
          if (!acknowledgedAlerts[item.id]) alertsList.push(item);
          else acknowledgedList.push(item);
        }
      }

      // 10. First Flush Drying Process Timer
      if (u.firstFlush?.dryingProcess) {
        const dp = u.firstFlush.dryingProcess;
        const target = dp.targetSeconds || 180;
        let rem = dp.remainingSeconds ?? target;
        if (dp.isRunning && dp.targetEndTimestamp) {
          rem = Math.max(0, Math.ceil((dp.targetEndTimestamp - now) / 1000));
        }
        const item: ActiveTimerItem = {
          id: `${u.id}-drying-process`,
          unitId: u.id,
          serialNumber: u.serialNumber,
          customerName: u.customerName,
          stageId: 'first_flush',
          stageName: 'First Flush · Drying Process',
          timerName: 'Forced Air/Gas Core Moisture Evacuation',
          badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
          remainingSeconds: rem,
          targetSeconds: target,
          isRunning: Boolean(dp.isRunning),
          isCompleted: Boolean(dp.timerCompleted || (dp.isRunning && rem <= 0)),
          targetEndTimestamp: dp.targetEndTimestamp,
          completedAt: dp.completedAt,
          icon: 'wind',
        };
        if (item.isRunning && rem > 0) runningList.push(item);
        if (item.isCompleted) {
          if (!acknowledgedAlerts[item.id]) alertsList.push(item);
          else acknowledgedList.push(item);
        }
      }

      // 11. Pressure Test: Submerged Water Bath 5-Minute Gas Flow Timer
      if (u.pressureTest?.gasFlowTimer) {
        const gft = u.pressureTest.gasFlowTimer;
        const target = gft.targetSeconds || 300;
        let rem = gft.remainingSeconds ?? target;
        if (gft.isRunning && gft.targetEndTimestamp) {
          rem = Math.max(0, Math.ceil((gft.targetEndTimestamp - now) / 1000));
        }
        const item: ActiveTimerItem = {
          id: `${u.id}-water-bath-gas`,
          unitId: u.id,
          serialNumber: u.serialNumber,
          customerName: u.customerName,
          stageId: 'pressure_test',
          stageName: 'Pressure Test · Water Bath',
          timerName: '5-Minute Submerged Gas Flow Dwell',
          badgeColor: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
          remainingSeconds: rem,
          targetSeconds: target,
          isRunning: Boolean(gft.isRunning),
          isCompleted: Boolean(gft.timerCompleted || (gft.isRunning && rem <= 0)),
          targetEndTimestamp: gft.targetEndTimestamp,
          completedAt: gft.completedAt,
          icon: 'droplets',
        };
        if (item.isRunning && rem > 0) runningList.push(item);
        if (item.isCompleted) {
          if (!acknowledgedAlerts[item.id]) alertsList.push(item);
          else acknowledgedList.push(item);
        }
      }
    });

    return {
      activeTimers: runningList,
      completedAlerts: alertsList,
      acknowledgedAlertsList: acknowledgedList,
    };
  }, [units, acknowledgedAlerts]);

  // Periodic audible beep if unacknowledged alarms exist
  useEffect(() => {
    if (!soundEnabled || completedAlerts.length === 0) return;
    const interval = setInterval(() => {
      audioAlert.playWarningBeep();
    }, 8000);
    return () => clearInterval(interval);
  }, [soundEnabled, completedAlerts.length]);

  const handleAcknowledgeAlert = (alert: ActiveTimerItem) => {
    setAcknowledgedAlerts((prev) => {
      const updated = { ...prev, [alert.id]: true };
      try {
        localStorage.setItem('depot_acknowledged_alerts', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    // Auto-save unit state when alert acknowledged
    if (onUpdateUnit) {
      onUpdateUnit((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
      }), `Acknowledged timer alert: ${alert.timerName} (${alert.serialNumber})`, alert.unitId);
    }
    audioAlert.playClick();
  };

  const handleAcknowledgeAll = () => {
    const updated = { ...acknowledgedAlerts };
    completedAlerts.forEach((a) => {
      updated[a.id] = true;
    });
    setAcknowledgedAlerts(updated);
    try {
      localStorage.setItem('depot_acknowledged_alerts', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
    if (onUpdateUnit && completedAlerts.length > 0) {
      completedAlerts.forEach((a) => {
        onUpdateUnit((prev) => ({
          ...prev,
          updatedAt: new Date().toISOString(),
        }), `Acknowledged timer alert: ${a.timerName} (${a.serialNumber})`, a.unitId);
      });
    }
    audioAlert.playClick();
  };

  const handleReinstateAlert = (alert: ActiveTimerItem) => {
    setAcknowledgedAlerts((prev) => {
      const updated = { ...prev };
      delete updated[alert.id];
      try {
        localStorage.setItem('depot_acknowledged_alerts', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    if (onUpdateUnit) {
      onUpdateUnit((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
      }), `Reinstated alarm: ${alert.timerName} (${alert.serialNumber})`, alert.unitId);
    }
    audioAlert.playWarningBeep();
  };

  const handleReinstateAll = () => {
    setAcknowledgedAlerts({});
    try {
      localStorage.removeItem('depot_acknowledged_alerts');
    } catch (e) {
      console.warn(e);
    }
    if (onUpdateUnit) {
      onUpdateUnit((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
      }), `Reinstated all alarms across workshop timers`);
    }
    audioAlert.playWarningBeep();
  };

  const renderTimerIcon = (icon: ActiveTimerItem['icon']) => {
    switch (icon) {
      case 'droplets': return <Droplets className="h-4 w-4" />;
      case 'flame': return <Flame className="h-4 w-4" />;
      case 'sparkles': return <Sparkles className="h-4 w-4" />;
      case 'wind': return <Wind className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatCountdown = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainingSecs = secs % 60;
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  const totalCountdowns = activeTimers.length;
  const totalAlerts = completedAlerts.length;

  return (
    <div className="space-y-4">
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold border transition-colors ${
              totalAlerts > 0
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse'
                : totalCountdowns > 0
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}>
              {totalAlerts > 0 ? (
                <BellRing className="h-5 w-5 animate-bounce" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
            </div>
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center shadow-md animate-ping" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight uppercase flex items-center gap-2">
                <span>Workshop Process Timers &amp; Live Alerts</span>
              </h2>
              {totalCountdowns > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>{totalCountdowns} RUNNING</span>
                </span>
              )}
              {totalAlerts > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="h-3 w-3 text-rose-400" />
                  <span>{totalAlerts} ALERTS PENDING</span>
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Persistent multi-station wall-clock timing with automatic background execution across tabs and audible alerts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
                : 'bg-neutral-900 text-neutral-500 border-neutral-800'
            }`}
            title={soundEnabled ? 'Audio Alerts Enabled' : 'Audio Alerts Muted'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                <span>Audio Alerts: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5 text-neutral-500" />
                <span>Muted</span>
              </>
            )}
          </button>

          {totalAlerts > 0 && (
            <button
              type="button"
              onClick={handleAcknowledgeAll}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-neutral-950 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Acknowledge All ({totalAlerts})</span>
            </button>
          )}

          {acknowledgedAlertsList.length > 0 && (
            <button
              type="button"
              onClick={handleReinstateAll}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Reinstate all acknowledged alarms to active ringing state"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reinstate All ({acknowledgedAlertsList.length})</span>
            </button>
          )}

          {acknowledgedAlertsList.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAcknowledgedHistory((s) => !s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 ${
                showAcknowledgedHistory
                  ? 'bg-neutral-800 text-white border-neutral-600'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>{showAcknowledgedHistory ? 'Hide Acknowledged' : `Acknowledged (${acknowledgedAlertsList.length})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. HIGH-PRIORITY COMPLETED TIMER ALERTS */}
      {completedAlerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-rose-400 px-1">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
              <span>Action Required · Completed Process Timers ({completedAlerts.length})</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {completedAlerts.map((alert) => {
              const meta = getTeamMetadata(alert.customerName);
              return (
                <div
                  key={alert.id}
                  className="bg-rose-950/30 border-2 border-rose-500/60 hover:border-rose-400 rounded-2xl p-4 shadow-lg flex flex-col justify-between gap-3 animate-pulse transition-all relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
                        <BellRing className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-rose-300 font-bold block">
                          {alert.stageName} · Cycle Completed
                        </span>
                        <h4 className="text-sm font-bold text-white leading-tight">
                          {alert.timerName}
                        </h4>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
                      COMPLETE
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-rose-500/30 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-amber-300">
                        {alert.serialNumber}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 truncate max-w-[150px]">
                        {alert.customerName}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300">
                      Target duration reached. Component requires immediate operator evacuation, wash cycle advance, or next stage progression.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-rose-500/20">
                    <button
                      type="button"
                      onClick={() => onOpenUnitWorkflow(alert.unitId, alert.stageId)}
                      className="flex-1 py-2 px-3 bg-rose-500 hover:bg-rose-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Stage in Workflow</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAcknowledgeAlert(alert)}
                      className="py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                      title="Dismiss alert banner & auto-save unit"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Acknowledge</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1B. ACKNOWLEDGED ALERTS LIST WITH REINSTATE ALARM CAPABILITY */}
      {showAcknowledgedHistory && acknowledgedAlertsList.length > 0 && (
        <div className="space-y-2 p-4 rounded-2xl bg-neutral-950 border border-neutral-800 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 px-1">
            <span className="flex items-center gap-1.5 text-amber-400">
              <History className="h-3.5 w-3.5" />
              <span>Acknowledged Timer Alerts ({acknowledgedAlertsList.length}) · Ready to Reinstate</span>
            </span>
            <button
              type="button"
              onClick={handleReinstateAll}
              className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
            >
              Reinstate All ({acknowledgedAlertsList.length})
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {acknowledgedAlertsList.map((alert) => (
              <div
                key={alert.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">
                      {alert.stageName} · Acknowledged
                    </span>
                    <h5 className="text-xs font-bold text-neutral-200">{alert.timerName}</h5>
                    <span className="text-[10px] font-mono text-amber-400">{alert.serialNumber} · {alert.customerName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-neutral-800 text-neutral-400 border border-neutral-700">
                    SILENCED
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => handleReinstateAlert(alert)}
                    className="flex-1 py-1.5 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="Reinstate alarm to active ringing state"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>↺ Reinstate Alarm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenUnitWorkflow(alert.unitId, alert.stageId)}
                    className="py-1.5 px-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs cursor-pointer"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. ACTIVE RUNNING PROCESS TIMERS */}
      {activeTimers.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-amber-400 px-1">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>Live Active Countdowns Across Workshop ({activeTimers.length})</span>
            </span>
            <span className="text-[10px] text-neutral-500">
              Synced with Background Worker &middot; Zero Tab Throttling
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTimers.map((timer) => {
              const pct = timer.targetSeconds > 0
                ? Math.min(100, Math.max(0, Math.round(((timer.targetSeconds - timer.remainingSeconds) / timer.targetSeconds) * 100)))
                : 0;
              const formattedTime = formatCountdown(timer.remainingSeconds);
              const decimalHours = (timer.remainingSeconds / 3600).toFixed(2);

              return (
                <div
                  key={timer.id}
                  className="bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 rounded-2xl p-4 shadow-md flex flex-col justify-between gap-3 transition-all relative group"
                >
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${timer.badgeColor}`}>
                        {renderTimerIcon(timer.icon)}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold block">
                          {timer.stageName}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                          {timer.timerName}
                        </h4>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 bg-amber-500/10 text-amber-400 border-amber-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                      <span>RUNNING</span>
                    </span>
                  </div>

                  {/* Digital Clock Readout & Unit Meta */}
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div className="text-3xl font-black font-mono tracking-tight text-white tabular-nums">
                        {formattedTime}
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-amber-400 block">
                          {decimalHours} hrs left
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500 block">
                          Target: {Math.round(timer.targetSeconds / 60)} min
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-1000 ease-linear"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-neutral-400">
                        <span>Elapsed: {pct}%</span>
                        <span>Continuous background clock</span>
                      </div>
                    </div>

                    {/* Unit & Customer Info */}
                    <div className="pt-1 border-t border-neutral-800 flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-neutral-200">
                        {timer.serialNumber}
                      </span>
                      <span className="text-neutral-400 truncate max-w-[140px] text-right">
                        {timer.customerName}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  <button
                    type="button"
                    onClick={() => onOpenUnitWorkflow(timer.unitId, timer.stageId)}
                    className="w-full py-2 px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500 text-neutral-200 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Open Stage in Workflow</span>
                    <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* IDLE STATUS CARD */
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-neutral-400">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-300 block uppercase tracking-wider font-mono">
                All Workshop Timers Idle · 0 Active Process Countdowns
              </span>
              <p className="text-[11px] text-neutral-400">
                Launch a Degreasing Bath, First Flush, Final Rinse, or Oven Bake timer from any active unit workflow.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-neutral-900 text-emerald-400 border border-neutral-800 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>Background Heartbeat Active</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
