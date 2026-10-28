import React, { useState, useEffect } from 'react';
import { 
  Gauge, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  AlertTriangle, 
  ShieldCheck, 
  Shield,
  Clock, 
  Zap,
  Wrench,
  Sparkles,
  RotateCcw,
  FileText,
  Check,
  Cpu,
  Layers,
  QrCode,
  Droplets,
  Play,
  Pause,
  Plus,
  Activity,
  Eye,
  Waves
} from 'lucide-react';
import { ServiceUnit, GlueRepairData, PressureTestData, CombiSubUnit } from '../../types/process';
import { ensureCombiConfig } from '../../utils/storage';
import { getDefaultPressureForComponent } from '../../utils/pressure';
import { StepSopViewer } from '../StepSopModal';

const POPULAR_GLUE_OPTIONS = [
  'Loctite EA 9497 (High Temp 200°C Thermal Transfer Epoxy)',
  'Belzona 1111 Super Metal (Aerospace Fluid Resistant)',
  'Araldite 2014-2 (Chemical & Heat Resistant Epoxy)',
  'Devcon Titanium Putty (High Strength Structural Sealant)',
  'Permabond ES550 (High Temperature Single-Part Epoxy)',
  'Custom Structural Epoxy Compound'
];

interface PressureTestingStepProps {
  unit: ServiceUnit;
  onUpdateUnit: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onOpenScanner?: () => void;
}

export const PressureTestingStep: React.FC<PressureTestingStepProps> = ({
  unit,
  onUpdateUnit,
  onNextStep,
  onPrevStep,
  onOpenScanner,
}) => {
  const config = unit.processConfig;
  const combi = ensureCombiConfig(unit);
  const isCombi = !!combi && combi.isCombi && combi.subUnits && combi.subUnits.length > 0;
  const subUnits: CombiSubUnit[] = isCombi ? combi.subUnits : [];

  const [activeSubIndex, setActiveSubIndex] = useState<number>(0);

  const currentSubUnit: CombiSubUnit | null = isCombi ? (subUnits[activeSubIndex] || subUnits[0]) : null;
  const pressure: PressureTestData = currentSubUnit ? currentSubUnit.pressureTest : unit.pressureTest;

  const [showGlueRepairForm, setShowGlueRepairForm] = useState<boolean>(() => {
    return !!pressure.glueRepair?.applied || pressure.testResult === 'FAIL';
  });

  // Local glue repair form state initialized from existing unit data or defaults
  const [glueType, setGlueType] = useState<string>(
    pressure.glueRepair?.glueType || 'Loctite EA 9497 (High Temp 200°C Thermal Transfer Epoxy)'
  );
  const [leakLocation, setLeakLocation] = useState<string>(
    pressure.glueRepair?.leakLocation || 'Core tube-to-header plate seam (Row 3, Port B side)'
  );
  const [curingMethod, setCuringMethod] = useState<'ambient_24h' | 'heat_accelerated_60m' | 'heat_cure_120c' | 'uv_cure'>(
    pressure.glueRepair?.curingMethod || 'heat_accelerated_60m'
  );
  const [cureDurationMinutes, setCureDurationMinutes] = useState<number>(
    pressure.glueRepair?.cureDurationMinutes || 60
  );
  const [technician, setTechnician] = useState<string>(
    pressure.glueRepair?.technician || unit.intake.technician || 'N. Malgarotti'
  );
  const [repairNotes, setRepairNotes] = useState<string>(
    pressure.glueRepair?.notes || 'Cleaned surface with solvent, abraded with 120-grit, applied two-part epoxy paste over hairline defect.'
  );

  // Post-repair retest fields
  const [retestPressureBar, setRetestPressureBar] = useState<number>(
    pressure.glueRepair?.retestPressureBar || pressure.testPressureBar || config.pressureTargetBar || 180
  );
  const [retestHeldSeconds, setRetestHeldSeconds] = useState<number>(
    pressure.glueRepair?.retestHeldSeconds || 60
  );
  const [retestStartPressure, setRetestStartPressure] = useState<number>(
    pressure.glueRepair?.retestPressureBar || pressure.testPressureBar || 180.1
  );
  const [retestEndPressure, setRetestEndPressure] = useState<number>(
    pressure.glueRepair?.retestEndPressureBar || pressure.testPressureBar || 180.0
  );

  const updateField = (key: string, value: unknown, logMsg?: string) => {
    onUpdateUnit((prev) => {
      if (isCombi) {
        const currentCfg = ensureCombiConfig(prev);
        if (!currentCfg) return prev;
        const updatedSubs = [...currentCfg.subUnits];
        const activeSub = { ...updatedSubs[activeSubIndex] };
        const updatedPres: PressureTestData = {
          ...activeSub.pressureTest,
          [key]: value,
        };

        if (key === 'startPressureBar' || key === 'endPressureBar') {
          const delta = Math.abs(Number(updatedPres.startPressureBar) - Number(updatedPres.endPressureBar));
          if (delta > updatedPres.allowableDeltaBar && updatedPres.testResult === 'PASS') {
            updatedPres.testResult = 'FAIL';
          }
        }

        activeSub.pressureTest = updatedPres;
        updatedSubs[activeSubIndex] = activeSub;

        return {
          ...prev,
          combiConfig: {
            ...currentCfg,
            subUnits: updatedSubs,
          },
          ...(activeSubIndex === 0 ? { pressureTest: updatedPres } : {}),
        };
      } else {
        const updated = {
          ...prev.pressureTest,
          [key]: value,
        };

        if (key === 'startPressureBar' || key === 'endPressureBar') {
          const delta = Math.abs(Number(updated.startPressureBar) - Number(updated.endPressureBar));
          if (delta > updated.allowableDeltaBar && updated.testResult === 'PASS') {
            updated.testResult = 'FAIL';
          }
        }

        return {
          ...prev,
          pressureTest: updated,
        };
      }
    }, logMsg);
  };

  const handlePressureChange = (bar: number) => {
    onUpdateUnit((prev) => {
      const startP = bar;
      const endP = bar;
      if (isCombi) {
        const currentCfg = ensureCombiConfig(prev);
        if (!currentCfg) return prev;
        const updatedSubs = [...currentCfg.subUnits];
        const activeSub = { ...updatedSubs[activeSubIndex] };
        activeSub.pressureTest = {
          ...activeSub.pressureTest,
          testPressureBar: bar,
          startPressureBar: startP,
          endPressureBar: endP,
          heldDurationSeconds: activeSub.pressureTest.heldDurationSeconds || 60,
          allowableDeltaBar: activeSub.pressureTest.allowableDeltaBar || 0.05,
        };
        updatedSubs[activeSubIndex] = activeSub;
        return {
          ...prev,
          processConfig: {
            ...prev.processConfig,
            pressureTargetBar: bar,
          },
          combiConfig: { ...currentCfg, subUnits: updatedSubs },
          ...(activeSubIndex === 0 ? { pressureTest: activeSub.pressureTest } : {}),
        };
      } else {
        return {
          ...prev,
          processConfig: {
            ...prev.processConfig,
            pressureTargetBar: bar,
          },
          pressureTest: {
            ...prev.pressureTest,
            testPressureBar: bar,
            startPressureBar: startP,
            endPressureBar: endP,
            heldDurationSeconds: prev.pressureTest.heldDurationSeconds || 60,
            allowableDeltaBar: prev.pressureTest.allowableDeltaBar || 0.05,
          },
          intake: {
            ...prev.intake,
            incomingPressureTest: prev.intake?.incomingPressureTest ? {
              ...prev.intake.incomingPressureTest,
              testPressureBar: bar,
              startPressureBar: startP,
              endPressureBar: endP,
            } : undefined,
          },
        };
      }
    }, `Updated test pressure to ${bar} Bar`);
  };

  const activeComponentType = currentSubUnit?.componentType || unit.componentType || 'water_radiator';
  const autoTargetPressure = getDefaultPressureForComponent(activeComponentType);

  // Automatically fill out pressure test targets per SOP specification:
  // Water Radiator: 3.0 Bar, Oil Cooler: 10.0 Bar, Intercooler: 2.0 Bar
  useEffect(() => {
    const currentVal = Number(pressure.testPressureBar || 0);
    if (!currentVal || currentVal === 0 || currentVal === 180) {
      handlePressureChange(autoTargetPressure);
    }
  }, [activeSubIndex, activeComponentType, autoTargetPressure]);

  const handleMediumChange = (med: string) => {
    onUpdateUnit((prev) => {
      const mediumKey = med.toLowerCase().includes('water') ? 'water' : med.toLowerCase().includes('helium') ? 'helium' : med.toLowerCase().includes('air') ? 'dry_air' : 'nitrogen';
      if (isCombi) {
        const currentCfg = ensureCombiConfig(prev);
        if (!currentCfg) return prev;
        const updatedSubs = [...currentCfg.subUnits];
        const activeSub = { ...updatedSubs[activeSubIndex] };
        activeSub.pressureTest = {
          ...activeSub.pressureTest,
          medium: med,
        };
        updatedSubs[activeSubIndex] = activeSub;
        return {
          ...prev,
          combiConfig: { ...currentCfg, subUnits: updatedSubs },
          ...(activeSubIndex === 0 ? { pressureTest: activeSub.pressureTest } : {}),
        };
      } else {
        return {
          ...prev,
          pressureTest: {
            ...prev.pressureTest,
            medium: med,
          },
          intake: {
            ...prev.intake,
            incomingPressureTest: prev.intake?.incomingPressureTest ? {
              ...prev.intake.incomingPressureTest,
              medium: mediumKey as any,
            } : undefined,
          },
        };
      }
    }, `Updated test medium to ${med}`);
  };

  const handleSetResult = (res: 'PASS' | 'FAIL') => {
    if (res === 'FAIL') {
      setShowGlueRepairForm(true);
    }
    onUpdateUnit((prev) => {
      if (isCombi) {
        const currentCfg = ensureCombiConfig(prev);
        if (!currentCfg) return prev;
        const updatedSubs = [...currentCfg.subUnits];
        updatedSubs[activeSubIndex] = {
          ...updatedSubs[activeSubIndex],
          pressureTest: {
            ...updatedSubs[activeSubIndex].pressureTest,
            testResult: res,
            leakDetected: res === 'FAIL',
          },
        };
        return {
          ...prev,
          combiConfig: {
            ...currentCfg,
            subUnits: updatedSubs,
          },
          ...(activeSubIndex === 0 ? {
            pressureTest: {
              ...prev.pressureTest,
              testResult: res,
              leakDetected: res === 'FAIL',
            }
          } : {}),
        };
      } else {
        return {
          ...prev,
          pressureTest: {
            ...prev.pressureTest,
            testResult: res,
            leakDetected: res === 'FAIL',
          },
        };
      }
    }, `Pressure test result marked: ${res}`);
  };

  // Quick action: Certify ALL Comby cores at once with zero leak
  const handleCertifyAllCombiCores = () => {
    onUpdateUnit((prev) => {
      const currentCfg = ensureCombiConfig(prev);
      if (!currentCfg) return prev;
      const now = new Date().toISOString();

      const defaultPressures = [4.0, 16.0, 8.0];
      const updatedSubs = currentCfg.subUnits.map((sub, idx) => {
        const targetBar = sub.pressureTest.testPressureBar || defaultPressures[idx] || 10.0;
        return {
          ...sub,
          pressureTest: {
            ...sub.pressureTest,
            testPressureBar: targetBar,
            startPressureBar: Number((targetBar + 0.05).toFixed(2)),
            endPressureBar: targetBar,
            heldDurationSeconds: 60,
            allowableDeltaBar: 0.1,
            testResult: 'PASS' as const,
            leakDetected: false,
            notes: `${sub.name}: Hydrostatic proof pressure held at ${targetBar} Bar for 60s with zero pressure decay. Inspection PASSED.`,
            completedAt: now,
          },
        };
      });

      return {
        ...prev,
        combiConfig: {
          ...currentCfg,
          subUnits: updatedSubs,
        },
        pressureTest: updatedSubs[0].pressureTest,
      };
    }, 'Simultaneously proof tested and certified ALL Comby unit circuits (PASS with zero decay)');
  };

  // Water Bath with 5-Minute Gas Flow Through Tubes Handlers
  const gasTimer = pressure.gasFlowTimer || { targetSeconds: 300, remainingSeconds: 300, isRunning: false, timerCompleted: false };
  const gasRemaining = gasTimer.remainingSeconds ?? 300;
  const isGasRunning = Boolean(gasTimer.isRunning);
  const isGasDone = Boolean(gasTimer.timerCompleted || (isGasRunning && gasRemaining <= 0));

  const formatGasCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleStartGasTimer = () => {
    const rem = gasRemaining > 0 ? gasRemaining : 300;
    const targetEnd = Date.now() + rem * 1000;
    updateField('gasFlowTimer', {
      targetSeconds: 300,
      remainingSeconds: rem,
      isRunning: true,
      timerCompleted: false,
      targetEndTimestamp: targetEnd,
    }, 'Started 5-Minute Submerged Water Bath Gas Flow Dwell Timer');
  };

  const handlePauseGasTimer = () => {
    updateField('gasFlowTimer', {
      ...gasTimer,
      isRunning: false,
      targetEndTimestamp: undefined,
    }, 'Paused Water Bath Gas Flow Timer');
  };

  const handleResetGasTimer = (seconds = 300) => {
    updateField('gasFlowTimer', {
      targetSeconds: seconds,
      remainingSeconds: seconds,
      isRunning: false,
      timerCompleted: false,
      targetEndTimestamp: undefined,
    }, `Reset Water Bath Gas Flow Timer to ${Math.round(seconds / 60)} minutes`);
  };

  const handleAddGasSeconds = (add = 30) => {
    const nextRem = (gasTimer.remainingSeconds ?? 300) + add;
    updateField('gasFlowTimer', {
      ...gasTimer,
      remainingSeconds: nextRem,
      targetSeconds: (gasTimer.targetSeconds ?? 300) + add,
      targetEndTimestamp: gasTimer.isRunning ? (Date.now() + nextRem * 1000) : ((gasTimer as any).targetEndTimestamp ?? undefined),
      timerCompleted: false,
    }, `Added +${add}s to Gas Flow Timer`);
  };

  const handleSetBubbleVerdict = (verdict: 'ZERO_BUBBLES_PASS' | 'BUBBLE_LEAK_FAIL') => {
    onUpdateUnit((prev) => {
      const now = new Date().toISOString();
      const updatedPres: PressureTestData = {
        ...(isCombi && currentSubUnit ? currentSubUnit.pressureTest : prev.pressureTest),
        waterBathSubmerged: true,
        waterBathTankId: prev.pressureTest?.waterBathTankId || 'WB-OPTICAL-01 (Submerged Water Bath)',
        waterBathTempC: prev.pressureTest?.waterBathTempC || 21.0,
        gasFlowThroughTubesDurationSeconds: 300,
        bubbleCheckVerdict: verdict,
        testResult: verdict === 'ZERO_BUBBLES_PASS' ? 'PASS' : 'FAIL',
        leakDetected: verdict === 'BUBBLE_LEAK_FAIL',
        notes: verdict === 'ZERO_BUBBLES_PASS'
          ? `Submerged Water Bath 5-Minute Gas Flow completed (WB-OPTICAL-01). ZERO bubble emissions observed across matrix tubes. Pass.`
          : `Submerged Water Bath Gas Flow check FAILED. Bubble stream detected during 5-minute tube dwell. Epoxy repair required.`,
        completedAt: now,
      };

      if (isCombi) {
        const currentCfg = ensureCombiConfig(prev);
        if (!currentCfg) return prev;
        const updatedSubs = [...currentCfg.subUnits];
        updatedSubs[activeSubIndex] = {
          ...updatedSubs[activeSubIndex],
          pressureTest: updatedPres,
        };
        return {
          ...prev,
          combiConfig: { ...currentCfg, subUnits: updatedSubs },
          ...(activeSubIndex === 0 ? { pressureTest: updatedPres } : {}),
        };
      } else {
        return {
          ...prev,
          pressureTest: updatedPres,
        };
      }
    }, `Water bath bubble check verdict: ${verdict}`);
  };

  // Save Glue Repair & Mark for Re-Test
  const handleSaveGlueRepair = () => {
    const repairData: GlueRepairData = {
      applied: true,
      glueType,
      leakLocation,
      curingMethod,
      cureDurationMinutes,
      technician,
      notes: repairNotes,
      repairedAt: new Date().toISOString(),
      retestRequired: true,
      retestResult: 'PENDING',
      retestPressureBar,
      retestHeldSeconds,
    };

    onUpdateUnit((prev) => {
      if (isCombi) {
        const currentCfg = ensureCombiConfig(prev);
        if (!currentCfg) return prev;
        const updatedSubs = [...currentCfg.subUnits];
        const activeSub = { ...updatedSubs[activeSubIndex] };
        activeSub.pressureTest = {
          ...activeSub.pressureTest,
          glueRepair: repairData,
          notes: activeSub.pressureTest.notes 
            ? `${activeSub.pressureTest.notes} | Glue Repair: ${glueType} at ${leakLocation}`
            : `Glue Repair: ${glueType} applied at ${leakLocation}`,
        };
        updatedSubs[activeSubIndex] = activeSub;

        return {
          ...prev,
          combiConfig: {
            ...currentCfg,
            subUnits: updatedSubs,
          },
          ...(activeSubIndex === 0 ? { pressureTest: activeSub.pressureTest } : {}),
        };
      } else {
        return {
          ...prev,
          pressureTest: {
            ...prev.pressureTest,
            glueRepair: repairData,
            notes: prev.pressureTest.notes 
              ? `${prev.pressureTest.notes} | Glue Repair: ${glueType} at ${leakLocation}`
              : `Glue Repair: ${glueType} applied at ${leakLocation} (${curingMethod}, ${cureDurationMinutes}m cure).`,
          },
        };
      }
    }, `Applied glue repair using ${glueType} at ${leakLocation}`);
  };

  // Execute Post-Repair Hydrostatic Re-Test & Certify Pass
  const handleCompleteRetestPass = () => {
    const now = new Date().toISOString();
    const repairData: GlueRepairData = {
      applied: true,
      glueType,
      leakLocation,
      curingMethod,
      cureDurationMinutes,
      technician,
      notes: repairNotes,
      repairedAt: pressure.glueRepair?.repairedAt || now,
      retestRequired: true,
      retestResult: 'PASS',
      retestPressureBar,
      retestHeldSeconds,
      retestEndPressureBar: retestEndPressure,
      retestCompletedAt: now,
    };

    onUpdateUnit((prev) => {
      if (isCombi) {
        const currentCfg = ensureCombiConfig(prev);
        if (!currentCfg) return prev;
        const updatedSubs = [...currentCfg.subUnits];
        const activeSub = { ...updatedSubs[activeSubIndex] };
        activeSub.pressureTest = {
          ...activeSub.pressureTest,
          testResult: 'PASS',
          leakDetected: false,
          testPressureBar: retestPressureBar,
          startPressureBar: retestStartPressure,
          endPressureBar: retestEndPressure,
          heldDurationSeconds: retestHeldSeconds,
          glueRepair: repairData,
          notes: `Initial leak repaired with ${glueType} at ${leakLocation}. Post-repair re-test PASSED (${retestPressureBar} Bar held ${retestHeldSeconds}s, zero decay).`,
          completedAt: now,
        };
        updatedSubs[activeSubIndex] = activeSub;

        return {
          ...prev,
          combiConfig: {
            ...currentCfg,
            subUnits: updatedSubs,
          },
          ...(activeSubIndex === 0 ? { pressureTest: activeSub.pressureTest } : {}),
        };
      } else {
        return {
          ...prev,
          pressureTest: {
            ...prev.pressureTest,
            testResult: 'PASS',
            leakDetected: false,
            testPressureBar: retestPressureBar,
            startPressureBar: retestStartPressure,
            endPressureBar: retestEndPressure,
            heldDurationSeconds: retestHeldSeconds,
            glueRepair: repairData,
            notes: `Initial leak repaired with ${glueType} at ${leakLocation}. Post-repair re-test PASSED (${retestPressureBar} Bar held ${retestHeldSeconds}s, zero decay).`,
            completedAt: now,
          },
        };
      }
    }, `Post-repair hydrostatic re-test PASSED at ${retestPressureBar} Bar. Unit recertified.`);
  };

  // Check if all sub-units have passed or completed
  const allSubsPassed = isCombi
    ? subUnits.every((s) => s.pressureTest?.testResult === 'PASS')
    : pressure.testResult === 'PASS';

  const markCompleted = () => {
    const now = new Date().toISOString();
    onUpdateUnit((prev) => {
      if (isCombi) {
        const cfg = ensureCombiConfig(prev);
        const updatedSubs = (cfg?.subUnits || []).map((s) => ({
          ...s,
          pressureTest: {
            ...s.pressureTest,
            completedAt: now,
          },
        }));

        return {
          ...prev,
          combiConfig: cfg ? { ...cfg, subUnits: updatedSubs } : prev.combiConfig,
          pressureTest: {
            ...prev.pressureTest,
            completedAt: now,
          },
          currentStepId: 'final_flush',
        };
      } else {
        return {
          ...prev,
          pressureTest: {
            ...prev.pressureTest,
            completedAt: now,
          },
          currentStepId: 'final_flush',
        };
      }
    }, `Pressure testing completed for all units (${allSubsPassed ? 'PASS' : 'FAIL'})`);
    (onNextStep as any)('final_flush', 'pressure_test');
  };

  const hasGlueRepair = !!pressure.glueRepair?.applied;
  const isGlueRetestPass = pressure.glueRepair?.retestResult === 'PASS';

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              Stage 04
            </span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs text-neutral-300 font-mono">Hydrostatic Pressure Containment</span>
            {isCombi && (
              <>
                <span className="text-xs text-neutral-400">·</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  <span>COMBY ({subUnits.length} CIRCUITS)</span>
                </span>
              </>
            )}
            {hasGlueRepair && (
              <>
                <span className="text-xs text-neutral-400">·</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                  isGlueRetestPass 
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>
                  <Wrench className="h-3 w-3" />
                  <span>{isGlueRetestPass ? 'Glue Repaired & Recertified' : 'Glue Repair Applied'}</span>
                </span>
              </>
            )}
          </div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight mt-0.5">
            Pressure Testing &amp; Hydrostatic Integrity {isCombi && `(All ${subUnits.length} Cores)`}
          </h2>
          <p className="text-sm text-neutral-300 mt-1">
            {isCombi
              ? `Multi-Circuit Comby Assembly: Apply proof pressure independently to each core (Water, Oil, Gearbox). Assign Pass/Fail and structural glue repair for each circuit.`
              : 'Apply proof pressure, observe dwell time for pressure decay or flange weepage, and assign Pass/Fail. Structural glue repair protocol available if leak is detected.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <StepSopViewer stepId="pressure_test" />
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
              title="Scan Unit QR / Station Traveler"
            >
              <QrCode className="h-3.5 w-3.5 text-amber-400" />
              <span>Scan QR</span>
            </button>
          )}
          <button
            onClick={onPrevStep}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg cursor-pointer"
          >
            ← Previous
          </button>
          <button
            onClick={markCompleted}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <span>Confirm {isCombi ? `All ${subUnits.length} Pressure Tests` : 'Pressure'} &amp; Advance</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* COMBY SUB-UNIT SELECTOR TABS */}
      {isCombi && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-neutral-200 uppercase font-mono tracking-wider">
                Select Circuit for Proof Testing ({subUnits.length} Cores):
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCertifyAllCombiCores}
                className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/50 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Test and certify all comby units at once with zero leak"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                <span>⚡ Test &amp; Certify ALL {subUnits.length} Cores (Zero Leak)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {subUnits.map((sub, idx) => {
              const isSelected = activeSubIndex === idx;
              const subResult = sub.pressureTest?.testResult;
              const isSubPass = subResult === 'PASS';
              const isSubFail = subResult === 'FAIL';
              const subTarget = sub.pressureTest?.testPressureBar;

              return (
                <button
                  key={sub.id || idx}
                  type="button"
                  onClick={() => setActiveSubIndex(idx)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500 text-white ring-1 ring-purple-500/50 shadow-md'
                      : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-purple-300">
                      Core #{idx + 1}
                    </span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                      isSubPass
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : isSubFail
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {isSubPass ? 'PASS' : isSubFail ? 'LEAK DETECTED' : 'PENDING'}
                    </span>
                  </div>

                  <div>
                    <div className="font-bold text-xs leading-tight text-neutral-100">
                      {sub.name}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                      Proof: <strong className="text-amber-400">{subTarget || 4.0} Bar</strong> · {sub.serialNumber || `${unit.serialNumber}-U${idx + 1}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBMERGED WATER BATH WITH 5-MINUTE GAS FLOW THROUGH TUBES */}
      <div className="bg-gradient-to-b from-slate-900 to-neutral-950 border-2 border-cyan-500/40 rounded-2xl p-5 md:p-6 space-y-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-inner shrink-0">
              <Waves className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                  Stage 05 Primary Test Method
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  SUBMERGED WATER BATH · 5-MIN GAS DWELL
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-1 tracking-tight">
                Submerged Water Bath Gas Leakage Testing Station {isCombi && `(${currentSubUnit?.name})`}
              </h3>
            </div>
          </div>

          <div className="text-right font-mono text-xs">
            <span className="text-neutral-400 block text-[10px] uppercase">Inspection Tank</span>
            <strong className="text-cyan-300">{pressure.waterBathTankId || 'WB-OPTICAL-01'}</strong>
          </div>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">
          The heat exchanger core is completely submerged in an illuminated optical water bath. High-purity dry gas (nitrogen / dry air) is continuously flowed through the internal matrix tubes under proof pressure for a <strong>5-minute (300 seconds) continuous dwell</strong> while the technician performs optical observation for micro-bubble release.
        </p>

        {/* Station Setup Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
              Water Bath Tank ID
            </span>
            <input
              type="text"
              value={pressure.waterBathTankId || 'WB-OPTICAL-01'}
              onChange={(e) => updateField('waterBathTankId', e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
              Bath Immersion State
            </span>
            <div className="flex items-center gap-2 py-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <strong className="text-emerald-300 font-mono text-xs">100% Core Submerged</strong>
            </div>
            <span className="text-[10px] text-neutral-500 font-mono">Optical clear view</span>
          </div>

          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
              Water Temp (°C)
            </span>
            <input
              type="number"
              step="0.5"
              value={pressure.waterBathTempC || 21.0}
              onChange={(e) => updateField('waterBathTempC', Number(e.target.value))}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs font-mono text-neutral-200 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
              Gas Stream Profile
            </span>
            <div className="text-amber-400 font-bold font-mono text-xs py-1">
              {pressure.medium || 'Dry Nitrogen / Gas'}
            </div>
            <span className="text-[10px] text-neutral-500 font-mono">Through core tubes</span>
          </div>
        </div>

        {/* 5-Minute Gas Flow Through Tubes Dwell Timer Box */}
        <div className="bg-neutral-950 border border-cyan-500/30 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
                5-Minute Gas Flow Through Tubes Dwell Timer
              </span>
              {isGasRunning && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>STREAMING GAS</span>
                </span>
              )}
              {isGasDone && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  <span>5-MIN CYCLE COMPLETE</span>
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400">
              Continuous 300s submerged dwell. Timer keeps running across tabs and triggers workshop alarm on completion.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="font-mono text-3xl font-black text-white px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl tracking-wider text-center min-w-[110px]">
              {formatGasCountdown(gasRemaining)}
            </div>

            <div className="flex items-center gap-1.5">
              {!isGasRunning ? (
                <button
                  type="button"
                  onClick={handleStartGasTimer}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Start 5-Min Timer</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePauseGasTimer}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleResetGasTimer(300)}
                className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs transition-colors cursor-pointer border border-neutral-700"
                title="Reset to 5 Minutes (300s)"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleAddGasSeconds(30)}
                className="px-2.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono font-bold rounded-xl text-xs transition-colors cursor-pointer border border-neutral-700"
                title="Add +30 Seconds"
              >
                +30s
              </button>
            </div>
          </div>
        </div>

        {/* Optical Bubble Check Observation Selector */}
        <div className="space-y-2 pt-1 border-t border-neutral-850">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-neutral-300 uppercase flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-cyan-400" />
              <span>Optical Bubble Leakage Verdict (During 5-Min Dwell)</span>
            </span>
            <span className="text-[11px] font-mono text-neutral-400">
              Inspection Criterion: <strong>Zero Bubbles = PASS</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSetBubbleVerdict('ZERO_BUBBLES_PASS')}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                pressure.bubbleCheckVerdict === 'ZERO_BUBBLES_PASS'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40 shadow-lg'
                  : 'bg-neutral-950/70 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
              }`}
            >
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                pressure.bubbleCheckVerdict === 'ZERO_BUBBLES_PASS' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-neutral-900 text-neutral-500'
              }`}>
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-tight text-white">
                  ✓ ZERO BUBBLES OBSERVED (PASS)
                </div>
                <div className="text-[11px] text-neutral-300 mt-0.5">
                  5-minute gas flow dwell complete in water bath. Zero air/gas bubbles emitted from tubes, cores or joints.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSetBubbleVerdict('BUBBLE_LEAK_FAIL')}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                pressure.bubbleCheckVerdict === 'BUBBLE_LEAK_FAIL'
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-2 ring-rose-500/40 shadow-lg'
                  : 'bg-neutral-950/70 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
              }`}
            >
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                pressure.bubbleCheckVerdict === 'BUBBLE_LEAK_FAIL' ? 'bg-rose-500/30 text-rose-200' : 'bg-neutral-900 text-neutral-500'
              }`}>
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-tight text-white">
                  ✗ BUBBLE EMISSIONS DETECTED (FAIL)
                </div>
                <div className="text-[11px] text-neutral-300 mt-0.5">
                  Stream of bubbles or weeping observed during water bath immersion. Epoxy repair required below.
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Prominent PASS / FAIL Selector Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase font-bold text-neutral-300">
              {isCombi ? `Circuit Verdict: ${currentSubUnit?.name}` : 'Inspection Verdict'}
            </span>
            <h3 className="text-base font-bold text-neutral-100">
              Pressure Test Result Status
            </h3>
          </div>
          <div className="text-xs font-mono text-neutral-300">
            Target Proof Pressure: <strong className="text-amber-400">{pressure.testPressureBar || config.pressureTargetBar} Bar</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleSetResult('PASS')}
            className={`p-4 rounded-xl border flex items-center gap-3.5 transition-all cursor-pointer ${
              pressure.testResult === 'PASS'
                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40 shadow-lg'
                : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
            }`}
          >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              pressure.testResult === 'PASS' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-900 text-neutral-500'
            }`}>
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div className="text-base font-bold tracking-tight">
                {isGlueRetestPass ? 'PASS (Glue Repaired & Recertified)' : 'PASS (Certified 0 Leaks)'}
              </div>
              <div className="text-xs text-neutral-300">
                {isGlueRetestPass 
                  ? 'Epoxy sealant cured · Post-repair re-test verified with zero decay'
                  : '0 Leaks · Pressure held steady within allowable delta'}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSetResult('FAIL')}
            className={`p-4 rounded-xl border flex items-center gap-3.5 transition-all cursor-pointer ${
              pressure.testResult === 'FAIL'
                ? 'bg-rose-500/15 border-rose-500 text-rose-300 ring-2 ring-rose-500/40 shadow-lg'
                : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
            }`}
          >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              pressure.testResult === 'FAIL' ? 'bg-rose-500/20 text-rose-300' : 'bg-neutral-900 text-neutral-500'
            }`}>
              <XCircle className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div className="text-base font-bold tracking-tight">FAIL (Leak Detected / Rework)</div>
              <div className="text-xs text-neutral-300">
                Pressure decay exceeded tolerance or weepage observed · Glue repair option below
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* GLUE REPAIR OPTION ON FAIL / LEAK DETECTED */}
      {(pressure.testResult === 'FAIL' || hasGlueRepair || showGlueRepairForm) && (
        <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border-2 border-amber-500/40 rounded-2xl p-5 md:p-6 space-y-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                    Motorsport Epoxy Repair Protocol
                  </span>
                  {isGlueRetestPass && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      <span>Retest Verified PASS</span>
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-neutral-100 mt-1">
                  Structural Glue Repair &amp; Hydrostatic Recertification {isCombi && `(${currentSubUnit?.name})`}
                </h3>
              </div>
            </div>

            <div className="text-xs text-neutral-300 font-mono">
              AS9100D Standard: <span className="text-amber-400 font-bold">Approved Non-Destructive Repair</span>
            </div>
          </div>

          <p className="text-xs text-neutral-200 leading-relaxed">
            When pressure decay or weeping is detected on core tube-to-header seams, side plate joints, or port welds, apply an aerospace-grade structural adhesive compound to seal micro-fissures without compromising thermal conductivity. Execute a mandatory proof pressure re-test after cure cycle.
          </p>

          {/* Glue Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-neutral-200 mb-1.5 uppercase">
                Adhesive / Epoxy Resin Compound
              </label>
              <select
                value={glueType}
                onChange={(e) => setGlueType(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-3 py-2.5 text-xs font-sans focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {POPULAR_GLUE_OPTIONS.map((g) => (
                  <option key={g} value={g} className="bg-neutral-900 text-neutral-100">
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-neutral-200 mb-1.5 uppercase">
                Leak Location / Application Area
              </label>
              <input
                type="text"
                value={leakLocation}
                onChange={(e) => setLeakLocation(e.target.value)}
                placeholder="e.g. Header plate weld joint (Tube Row 3, Port B side)"
                className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-3 py-2.5 text-xs font-sans focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-neutral-200 mb-1.5 uppercase">
                Curing Profile &amp; Method
              </label>
              <select
                value={curingMethod}
                onChange={(e) => setCuringMethod(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-3 py-2.5 text-xs font-sans focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="heat_accelerated_60m" className="bg-neutral-900 text-neutral-100">
                  Heat Accelerated (60°C Hot Box / 60 Mins) — Recommended
                </option>
                <option value="heat_cure_120c" className="bg-neutral-900 text-neutral-100">
                  Oven Thermal Bake (120°C / 30 Mins)
                </option>
                <option value="ambient_24h" className="bg-neutral-900 text-neutral-100">
                  Ambient Workshop Cure (24 Hours @ 22°C)
                </option>
                <option value="uv_cure" className="bg-neutral-900 text-neutral-100">
                  UV / Rapid Light Polymerization (15 Mins)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-neutral-200 mb-1.5 uppercase">
                Repair Technician &amp; Stamp
              </label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="Technician Name / ID"
                className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl px-3 py-2.5 text-xs font-sans focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-neutral-200 mb-1.5 uppercase">
              Glue Preparation &amp; Application Notes
            </label>
            <textarea
              rows={2}
              value={repairNotes}
              onChange={(e) => setRepairNotes(e.target.value)}
              placeholder="Describe surface prep (solvent degrease, abrasive scour), mixing ratio, and glue bead thickness..."
              className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 rounded-xl p-3 text-xs font-sans focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSaveGlueRepair}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Log Glue Repair Data</span>
            </button>
            {hasGlueRepair && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                <span>Glue repair protocol logged</span>
              </span>
            )}
          </div>

          {/* Post-Repair Re-Test Verification Box */}
          <div className="p-4 bg-neutral-950 border border-amber-500/30 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                <span>Mandatory Post-Repair Hydrostatic Re-Test</span>
              </span>
              <span className="text-[11px] font-mono text-neutral-300">
                Target: {retestPressureBar} Bar Hold
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-300 mb-1">
                  Re-Test Pressure
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={retestPressureBar}
                    onChange={(e) => setRetestPressureBar(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-100"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-neutral-400 font-mono">Bar</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-300 mb-1">
                  Re-Test Hold Time
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={retestHeldSeconds}
                    onChange={(e) => setRetestHeldSeconds(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-100"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-neutral-400 font-mono">sec</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-300 mb-1">
                  Initial Start P1
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={retestStartPressure}
                    onChange={(e) => setRetestStartPressure(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-100"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-neutral-400 font-mono">Bar</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-300 mb-1">
                  Final End P2
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={retestEndPressure}
                    onChange={(e) => setRetestEndPressure(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-100"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-neutral-400 font-mono">Bar</span>
                </div>
              </div>
            </div>

            {/* Re-test Action Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800">
              <span className="text-[11px] font-mono text-neutral-300">
                Observed Re-Test Decay: <strong className={Math.abs(retestStartPressure - retestEndPressure) <= pressure.allowableDeltaBar ? 'text-emerald-400' : 'text-rose-400'}>
                  {Math.abs(retestStartPressure - retestEndPressure).toFixed(2)} Bar
                </strong> (Max Allowable: {pressure.allowableDeltaBar} Bar)
              </span>

              <button
                type="button"
                onClick={handleCompleteRetestPass}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer hover:scale-[1.01]"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm Re-Test PASS &amp; Recertify Circuit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Specification Standard & Hydrostatic Proof Pressure Audit Card */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-200">
              Specification Standard on Hydrostatic Proof Pressure
            </h4>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            BS EN 13445-5 / ISO 19879 / AS9100D
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="text-[10px] text-neutral-400 block uppercase">Standard Envelope</span>
            <span className="font-bold text-amber-400 text-sm">{pressure.testPressureBar || 4.0} BAR</span>
            <span className="text-[10px] text-neutral-500 block">≈ {Math.round((Number(pressure.testPressureBar || 4.0)) * 14.5038)} PSI</span>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="text-[10px] text-neutral-400 block uppercase">Proof Test Medium</span>
            <span className="font-bold text-sky-400 text-sm">{pressure.medium || 'Deionized Water'}</span>
            <span className="text-[10px] text-neutral-500 block">Containment Medium</span>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="text-[10px] text-neutral-400 block uppercase">Hold Dwell Time</span>
            <span className="font-bold text-neutral-100 text-sm">{pressure.heldDurationSeconds || 60} Seconds</span>
            <span className="text-[10px] text-neutral-500 block">Continuous Hold</span>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="text-[10px] text-neutral-400 block uppercase">Max Decay Delta (ΔP)</span>
            <span className="font-bold text-emerald-400 text-sm">≤ {pressure.allowableDeltaBar ?? 0.05} BAR</span>
            <span className="text-[10px] text-neutral-500 block">Zero Weepage Criteria</span>
          </div>
        </div>

        <p className="text-[11px] text-neutral-400 leading-relaxed pt-1">
          Specification standard matches the proof pressure test details. All hydraulic joints, header seams, and fluid matrices must sustain the target test envelope for full dwell with zero weepage or bubbles.
        </p>
      </div>

      {/* Pressure Testing Data Form: Strictly Test Pressure & Medium Input */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                <span>Stage 5 Parameters {isCombi && `(${currentSubUnit?.name})`}</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Configure proof test pressure and testing fluid / gas medium for certification.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-md text-xs font-mono font-bold bg-neutral-950 text-amber-400 border border-neutral-800">
              {pressure.testPressureBar || 0} BAR · {(Number(pressure.testPressureBar || 0) * 14.5038).toFixed(1)} PSI
            </span>
            <span className="px-3 py-1 rounded-md text-xs font-mono font-bold bg-neutral-950 text-sky-400 border border-neutral-800">
              Medium: {pressure.medium || 'Nitrogen'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Field 1: Test Pressure Input */}
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-amber-400" />
                <span>Test Pressure (Bar)</span>
              </label>
              <span className="text-[11px] font-mono text-neutral-400">
                ≈ {(Number(pressure.testPressureBar || 0) * 14.5038).toFixed(1)} PSI
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                value={pressure.testPressureBar || ''}
                onChange={(e) => handlePressureChange(Number(e.target.value))}
                placeholder="e.g. 4.0 or 180.0"
                className="w-full bg-neutral-900 border border-neutral-700/80 rounded-lg px-3.5 py-2.5 text-base font-mono font-bold text-neutral-100 focus:outline-none focus:border-amber-500 tabular-nums"
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-amber-400 font-mono font-bold">
                BAR
              </span>
            </div>

            {/* Quick Pressure Selector Presets: Water 3 Bar, Oil 10 Bar, Intercooler 2 Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-neutral-300 uppercase font-bold">
                  SOP Target Specifications (Strict Calibration):
                </span>
                <span className="text-[10px] font-mono text-amber-400">
                  Target: <strong>{autoTargetPressure} Bar</strong>
                </span>
              </div>

              {/* Top 3 Required Presets: Water 3 Bar, Oil 10 Bar, Intercooler 2 Bar */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handlePressureChange(3.0)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                    Number(pressure.testPressureBar) === 3.0
                      ? 'bg-amber-500/25 border-amber-500 text-amber-300 ring-2 ring-amber-500/40 shadow-sm'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <span className="text-[10px] font-mono uppercase text-sky-400 font-bold">Water Radiator</span>
                  <span className="text-base font-extrabold text-white mt-0.5">3.0 Bar</span>
                  <span className="text-[9.5px] text-neutral-400 font-mono">≈ 43.5 PSI</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePressureChange(10.0)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                    Number(pressure.testPressureBar) === 10.0
                      ? 'bg-amber-500/25 border-amber-500 text-amber-300 ring-2 ring-amber-500/40 shadow-sm'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">Oil Cooler</span>
                  <span className="text-base font-extrabold text-white mt-0.5">10.0 Bar</span>
                  <span className="text-[9.5px] text-neutral-400 font-mono">≈ 145.0 PSI</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePressureChange(2.0)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                    Number(pressure.testPressureBar) === 2.0
                      ? 'bg-amber-500/25 border-amber-500 text-amber-300 ring-2 ring-amber-500/40 shadow-sm'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold">Intercooler</span>
                  <span className="text-base font-extrabold text-white mt-0.5">2.0 Bar</span>
                  <span className="text-[9.5px] text-neutral-400 font-mono">≈ 29.0 PSI</span>
                </button>
              </div>

              {/* Secondary Options */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[9.5px] font-mono text-neutral-500 uppercase mr-1">Other:</span>
                {[
                  { bar: 4.0, label: '4.0 Bar' },
                  { bar: 8.0, label: '8.0 Bar' },
                  { bar: 16.0, label: '16.0 Bar' },
                ].map((item) => (
                  <button
                    key={item.bar}
                    type="button"
                    onClick={() => handlePressureChange(item.bar)}
                    className={`py-1 px-2.5 rounded-lg text-[10.5px] font-mono border transition-colors cursor-pointer ${
                      Number(pressure.testPressureBar) === item.bar
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Field 2: Test Medium Input */}
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-sky-400" />
                <span>Test Medium</span>
              </label>
              <span className="text-[11px] font-mono text-sky-400 font-bold">
                Current: {pressure.medium || 'Nitrogen'}
              </span>
            </div>

            {/* Medium Selector Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'Nitrogen', label: 'Nitrogen (N₂)' },
                { id: 'Helium', label: 'Helium (He)' },
                { id: 'Air', label: 'Dry Air' },
                { id: 'Water', label: 'Water' },
              ].map((m) => {
                const isSelected = (pressure.medium || 'Nitrogen').toLowerCase() === m.id.toLowerCase();
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMediumChange(m.id)}
                    className={`py-2 px-2 rounded-lg text-xs font-mono font-bold border text-center transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 ring-1 ring-sky-500/40'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Medium Input */}
            <div>
              <label className="text-[10px] font-mono text-neutral-400 block mb-1 uppercase">
                Custom Test Medium:
              </label>
              <input
                type="text"
                value={pressure.medium || ''}
                onChange={(e) => handleMediumChange(e.target.value)}
                placeholder="e.g. Helium (Mass-Spec Leak Check), Nitrogen Grade 5.0, Demineralised Water"
                className="w-full bg-neutral-900 border border-neutral-700/80 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
