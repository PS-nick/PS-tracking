import { 
  ServiceUnit, 
  StepId, 
  ActivityEntry, 
  UnitPriority, 
  ComponentType, 
  CombiConfig, 
  CombiSubUnit,
  OilDrainData,
  PreFlushData,
  FirstFlushData,
  PortFlushRecord,
  HeatExchangerMedium
} from '../types/process';
import { generateTechnicalSchematicSvg } from './media';
import { generateUnitQrInfoSync } from './qrCode';
import { getTeamMetadata, getCarAllocationFromChassis } from '../constants/motorsport';
import { 
  getCustomerDefaultEmail, 
  GUEST_DEMO_FAIL_PRESSURE_UNIT, 
  GUEST_DEMO_FAIL_CLEANLINESS_UNIT, 
  GUEST_DEMO_INPROGRESS_UNIT 
} from './customerAllocation';
import { generateSampleRigTestPdf } from './cleanRigPdf';
import { saveUnitsToIdb, loadUnitsFromIdb, clearUnitsIdb } from './idbStorage';
import { getDefaultPressureForComponent } from './pressure';

export { saveUnitsToIdb, loadUnitsFromIdb, clearUnitsIdb };

const STORAGE_KEY = 'protrace_sop_service_units_v1';
const ACTIVE_UNIT_KEY = 'protrace_sop_active_unit_id_v1';

export function getDefaultOilDrainData(componentType?: ComponentType): OilDrainData {
  return {
    performed: true,
    stationId: 'DRAIN-BAY-01',
    method: 'vacuum_scavenge',
    durationHours: 0.25, // 15 mins
    durationMinutes: 15,
    oilCollectedMl: undefined,
    oilCondition: 'dark_used',
    notes: 'Vacuum scavenge completed. No foreign metal shavings detected.',
    isRunning: false,
    remainingSeconds: 900,
    targetSeconds: 900,
    timerCompleted: true,
    completedAt: '2026-09-30T08:45:00.000Z',
    technician: 'N. Malgarotti',
  };
}

export function getDefaultPreFlushData(componentType?: ComponentType): PreFlushData {
  const isOil = componentType === 'oil_cooler';
  // 6 minutes for water and intercooler, and 10 for oil
  const deionizeMinutes = isOil ? 10 : 6;
  const deionizeHours = isOil ? 0.167 : 0.100;
  const targetSecs = deionizeMinutes * 60;

  let ports: PortFlushRecord[] = [
    { id: 'port_1', portName: 'Port 1: Inlet Coupling', targetDurationMinutes: 2, targetHours: 0.033, flushed: false },
    { id: 'port_2', portName: 'Port 2: Outlet Coupling', targetDurationMinutes: 2, targetHours: 0.033, flushed: false },
  ];

  if (componentType === 'combi_2_unit') {
    ports = [
      { id: 'p1', portName: 'Core 1 (Water) Inlet', targetDurationMinutes: 2, targetHours: 0.033, flushed: false },
      { id: 'p2', portName: 'Core 1 (Water) Outlet', targetDurationMinutes: 2, targetHours: 0.033, flushed: false },
      { id: 'p3', portName: 'Core 2 (Oil) Inlet', targetDurationMinutes: 2, targetHours: 0.033, flushed: false },
      { id: 'p4', portName: 'Core 2 (Oil) Outlet', targetDurationMinutes: 2, targetHours: 0.033, flushed: false },
    ];
  } else if (componentType === 'combi_3_unit') {
    ports = [
      { id: 'p1', portName: 'Core 1 (Water) Inlet', targetDurationMinutes: 2, targetHours: 0.033, flushed: false },
      { id: 'p2', portName: 'Core 1 (Water) Outlet', targetDurationMinutes: 2, targetHours: 0.033, flushed: false },
      { id: 'p3', portName: 'Core 2 (Oil) Inlet', targetDurationMinutes: 2, targetHours: 0.033, flushed: false },
      { id: 'p4', portName: 'Core 2 (Oil) Outlet', targetDurationMinutes: 2, targetHours: 0.033, flushed: false },
      { id: 'p5', portName: 'Core 3 (Intercooler) Inlet', targetDurationMinutes: 2, targetHours: 0.033, flushed: false },
      { id: 'p6', portName: 'Core 3 (Intercooler) Outlet', targetDurationMinutes: 2, targetHours: 0.033, flushed: false },
    ];
  }

  return {
    performed: false,
    portFlushCompleted: false,
    portFlushMinutesPerPort: 2,
    ports,
    deionize5mFlushCompleted: false,
    deionize5mRemainingSeconds: 300,
    deionize5mTargetSeconds: 300,
    deionize5mIsRunning: false,
    deionizeFlushCompleted: false,
    hotWaterFlushCompleted: false,
    deionizeWaterTempC: 55, // 55°C hot water flush
    deionizeDurationMinutes: deionizeMinutes,
    deionizeDurationHours: deionizeHours,
    deionizeResistivityPass: false,
    remainingSeconds: targetSecs,
    targetSeconds: targetSecs,
    isRunning: false,
    timerCompleted: false,
    completedAt: undefined,
    technician: 'N. Malgarotti',
    notes: '',
  };
}

export function getDefaultFirstFlushData(componentType?: ComponentType): FirstFlushData {
  const isOil = componentType === 'oil_cooler' || (typeof componentType === 'string' && componentType.includes('oil'));
  const durationMins = isOil ? 10 : 6;
  const durationHrs = isOil ? 0.167 : 0.100;
  const desoapSeconds = isOil ? 600 : 360; // 6 minutes if water or intercooler, 10 if oil
  return {
    performed: false,
    waterTempC: 55, // 55°C Deionized Water for getting rid of soaping agent
    targetDurationSeconds: durationMins * 60,
    durationMinutes: durationMins,
    durationHours: durationHrs,
    remainingSeconds: durationMins * 60,
    isRunning: false,
    timerCompleted: false,
    deionizeResistivityPass: false,
    soapingAgentEvacuated: false,
    effluentFoamFree: false,
    technician: 'Nicola Malgarotti',
    notes: '',
    completedAt: undefined,
    activePhase: 'powerwash_port_1',
    phase1PowerwashPort1: {
      targetSeconds: 120, // 2 minutes (120s)
      remainingSeconds: 120,
      isRunning: false,
      timerCompleted: false,
    },
    phase2PowerwashPort2: {
      targetSeconds: 120, // 2 minutes (120s)
      remainingSeconds: 120,
      isRunning: false,
      timerCompleted: false,
    },
    phase3Desoaping: {
      targetSeconds: desoapSeconds, // 6 minutes if water or intercooler, 10 if oil
      remainingSeconds: desoapSeconds,
      isRunning: false,
      timerCompleted: false,
    },
  };
}

export function getSubUnitDefaultSpec(type: ComponentType, idx: number, baseSerial: string = 'SN-CMB'): CombiSubUnit {
  const isOil = type === 'oil_cooler';
  const isIntercooler = type === 'intercooler';
  const isWater = type === 'water_radiator';
  const label = isOil ? 'Engine Oil Cooler Core' : isIntercooler ? 'Intercooler / Auxiliary Core' : isWater ? 'Water Radiator Core' : 'Heat Exchanger Core';

  return {
    id: `sub_${idx}`,
    unitIndex: idx,
    name: `Unit ${idx}: ${label}`,
    componentType: type,
    serialNumber: `${baseSerial}-U${idx}`,
    flowTest: {
      benchId: isOil ? 'FLOW-BENCH-04 (Calibrated)' : isIntercooler ? 'FLOW-BENCH-03 (Calibrated)' : 'FLOW-BENCH-02 (Calibrated)',
      fluidType: 'Deionized Water (DI Water)',
      fluidTempC: isOil ? 60.0 : 45.0,
      inletFlowLpm: isOil ? 19.5 : isIntercooler ? 15.2 : 24.8,
      outletFlowLpm: isOil ? 19.3 : isIntercooler ? 15.0 : 24.6,
      deltaPressureBar: isOil ? 1.45 : isIntercooler ? 0.95 : 0.65,
      flowPass: true,
      pointsPassThreshold: 3,
      technician: 'N. Malgarotti',
      notes: `${label} cooling matrix tested across 5 frequency steps (20-60 Hz). Conforming.`,
      testPoints: [
        { pointIndex: 1, name: 'P1 (20 Hz - Low Flow)', frequencyHz: 20, targetFlowLpm: isOil ? 8.0 : isIntercooler ? 6.0 : 12.0, tolerancePercent: 15, toleranceBandLpm: isOil ? 1.2 : isIntercooler ? 0.9 : 1.8, measuredFlowLpm: isOil ? 8.1 : isIntercooler ? 6.05 : 12.1, deltaPressureBar: isOil ? 0.45 : isIntercooler ? 0.35 : 0.25, passed: true },
        { pointIndex: 2, name: 'P2 (30 Hz - Cruise)', frequencyHz: 30, targetFlowLpm: isOil ? 13.0 : isIntercooler ? 10.0 : 18.0, tolerancePercent: 15, toleranceBandLpm: isOil ? 1.95 : isIntercooler ? 1.5 : 2.7, measuredFlowLpm: isOil ? 12.9 : isIntercooler ? 9.9 : 17.8, deltaPressureBar: isOil ? 0.85 : isIntercooler ? 0.65 : 0.45, passed: true },
        { pointIndex: 3, name: 'P3 (40 Hz - Mid Power)', frequencyHz: 40, targetFlowLpm: isOil ? 18.0 : isIntercooler ? 14.0 : 24.0, tolerancePercent: 15, toleranceBandLpm: isOil ? 2.7 : isIntercooler ? 2.1 : 3.6, measuredFlowLpm: isOil ? 18.2 : isIntercooler ? 14.1 : 24.2, deltaPressureBar: isOil ? 1.30 : isIntercooler ? 0.95 : 0.65, passed: true },
        { pointIndex: 4, name: 'P4 (50 Hz - High Duty)', frequencyHz: 50, targetFlowLpm: isOil ? 22.0 : isIntercooler ? 18.0 : 30.0, tolerancePercent: 15, toleranceBandLpm: isOil ? 3.3 : isIntercooler ? 2.7 : 4.5, measuredFlowLpm: isOil ? 21.8 : isIntercooler ? 17.7 : 29.7, deltaPressureBar: isOil ? 1.75 : isIntercooler ? 1.30 : 0.90, passed: true },
        { pointIndex: 5, name: 'P5 (60 Hz - Max Flow)', frequencyHz: 60, targetFlowLpm: isOil ? 26.0 : isIntercooler ? 22.0 : 35.0, tolerancePercent: 15, toleranceBandLpm: isOil ? 3.9 : isIntercooler ? 3.3 : 5.25, measuredFlowLpm: isOil ? 25.5 : isIntercooler ? 21.6 : 34.6, deltaPressureBar: isOil ? 2.10 : isIntercooler ? 1.65 : 1.15, passed: true },
      ],
      baselineSource: 'new_unit_birth_record',
    },
    pressureTest: {
      gaugeId: isOil ? 'DIGI-GAUGE-PG-91' : 'DIGI-GAUGE-PG-02',
      testPressureBar: getDefaultPressureForComponent(type),
      heldDurationSeconds: 60,
      startPressureBar: getDefaultPressureForComponent(type),
      endPressureBar: getDefaultPressureForComponent(type),
      allowableDeltaBar: isOil ? 0.2 : 0.1,
      testResult: 'PASS',
      leakDetected: false,
      technician: 'N. Malgarotti',
      notes: `${label} proof pressure held. 0 bubbles.`,
    },
  };
}

export function createDefaultCombiConfig(
  unitCount: 2 | 3 = 2,
  baseSerial: string = 'SN-CMB',
  baseWo: string = 'WO-2026',
  customTypes?: ComponentType[]
): CombiConfig {
  const types: ComponentType[] = customTypes && customTypes.length >= unitCount
    ? customTypes
    : unitCount === 3
    ? ['water_radiator', 'oil_cooler', 'intercooler']
    : ['water_radiator', 'oil_cooler'];

  const subUnits: CombiSubUnit[] = types.slice(0, unitCount).map((type, idx) => 
    getSubUnitDefaultSpec(type, idx + 1, baseSerial)
  );

  return {
    isCombi: true,
    unitCount,
    subUnits,
  };
}

export function ensureCombiConfig(unit: ServiceUnit): CombiConfig | null {
  if (unit.combiConfig?.isCombi && unit.combiConfig.subUnits && unit.combiConfig.subUnits.length > 0) {
    return unit.combiConfig;
  }
  if (unit.componentType === 'combi_2_unit') {
    return createDefaultCombiConfig(2, unit.serialNumber, unit.workOrderNumber);
  }
  if (unit.componentType === 'combi_3_unit') {
    return createDefaultCombiConfig(3, unit.serialNumber, unit.workOrderNumber);
  }
  return null;
}

export function getDefaultFlowTestPoints(isFirstService = false, withMeasurements = false) {
  const TOLERANCE_PCT = 15; // +/- 15% standard calibration bracket
  return [
    {
      pointIndex: 1,
      name: 'Point 1 (Idle / 20% Min Flow)',
      frequencyHz: 20, // 20 Hz operator drive reference
      targetFlowLpm: 10.0,
      tolerancePercent: TOLERANCE_PCT,
      toleranceBandLpm: Number((10.0 * (TOLERANCE_PCT / 100)).toFixed(2)), // +/- 1.50 LPM
      measuredFlowLpm: withMeasurements ? (isFirstService ? 10.0 : 10.25) : 0,
      measuredOutletLpm: withMeasurements ? 10.1 : 0,
      deltaPressureBar: withMeasurements ? 0.45 : 0,
      passed: withMeasurements,
      notes: withMeasurements ? 'Stable minimum cracking pressure at 20 Hz within +/- 15% bracket' : '',
    },
    {
      pointIndex: 2,
      name: 'Point 2 (Low / 40% Cruise)',
      frequencyHz: 30, // 30 Hz operator drive reference
      targetFlowLpm: 15.0,
      tolerancePercent: TOLERANCE_PCT,
      toleranceBandLpm: Number((15.0 * (TOLERANCE_PCT / 100)).toFixed(2)), // +/- 2.25 LPM
      measuredFlowLpm: withMeasurements ? (isFirstService ? 15.0 : 14.8) : 0,
      measuredOutletLpm: withMeasurements ? 14.75 : 0,
      deltaPressureBar: withMeasurements ? 0.8 : 0,
      passed: withMeasurements,
      notes: withMeasurements ? 'Smooth transition at 30 Hz within +/- 15% bracket' : '',
    },
    {
      pointIndex: 3,
      name: 'Point 3 (Mid-Range / 60% Duty)',
      frequencyHz: 40, // 40 Hz operator drive reference
      targetFlowLpm: 20.0,
      tolerancePercent: TOLERANCE_PCT,
      toleranceBandLpm: Number((20.0 * (TOLERANCE_PCT / 100)).toFixed(2)), // +/- 3.00 LPM
      measuredFlowLpm: withMeasurements ? (isFirstService ? 20.0 : 20.4) : 0,
      measuredOutletLpm: withMeasurements ? 20.25 : 0,
      deltaPressureBar: withMeasurements ? 1.15 : 0,
      passed: withMeasurements,
      notes: withMeasurements ? 'Nominal mid-stroke metering at 40 Hz within +/- 15% bracket' : '',
    },
    {
      pointIndex: 4,
      name: 'Point 4 (High Demand / 80% Output)',
      frequencyHz: 50, // 50 Hz operator drive reference
      targetFlowLpm: 24.5,
      tolerancePercent: TOLERANCE_PCT,
      toleranceBandLpm: Number((24.5 * (TOLERANCE_PCT / 100)).toFixed(2)), // +/- 3.68 LPM
      measuredFlowLpm: withMeasurements ? (isFirstService ? 24.5 : 24.8) : 0,
      measuredOutletLpm: withMeasurements ? 24.6 : 0,
      deltaPressureBar: withMeasurements ? 1.4 : 0,
      passed: withMeasurements,
      notes: withMeasurements ? 'Primary operating calibration band at 50 Hz within +/- 15% bracket' : '',
    },
    {
      pointIndex: 5,
      name: 'Point 5 (Full Capacity / 100% Max)',
      frequencyHz: 60, // 60 Hz operator drive reference
      targetFlowLpm: 28.0,
      tolerancePercent: TOLERANCE_PCT,
      toleranceBandLpm: Number((28.0 * (TOLERANCE_PCT / 100)).toFixed(2)), // +/- 4.20 LPM
      measuredFlowLpm: withMeasurements ? (isFirstService ? 28.0 : 27.65) : 0,
      measuredOutletLpm: withMeasurements ? 27.5 : 0,
      deltaPressureBar: withMeasurements ? 1.85 : 0,
      passed: withMeasurements,
      notes: withMeasurements ? 'Full pump delivery at 60 Hz within +/- 15% bracket' : '',
    },
  ];
}

export const INITIAL_SAMPLE_UNIT: ServiceUnit = {
  id: 'unit-8842',
  serialNumber: 'SN-8842-HP',
  lifeNumber: 2,
  partNumber: 'F1-PAS-940',
  modelName: 'F1 Hydraulic Power Steering Servo Actuator',
  customerName: 'Scuderia Ferrari HP',
  customerEmail: 'marco.rossi@scuderiaferrari.com',
  racingCategory: 'formula1',
  racingType: 'Grand Prix & Sprint Weekend',
  chassisNumber: 'SF-24 Chassis #03 (Car #16)',
  workOrderNumber: 'WO-2026-0941',
  componentType: 'heat_exchanger',
  supplierCompanyName: 'Ferrari Competizioni GT',
  supplierContactName: 'Marco Rossi',
  supplierContactEmail: 'marco.rossi@scuderiaferrari.com',
  assignedTechnician: 'Nicola Malgarotti',
  jobOrderNumber: 'WO-2026-0941',
  inhousePartNo: 'PS-HEX-940-A',
  drawingNumber: 'DWG-2026-F1-08',
  createdAt: '2026-09-30T08:15:00.000Z',
  updatedAt: '2026-09-30T09:20:00.000Z',
  currentStepId: 'flow_test',
  overallStatus: 'in_progress',
  priority: 'emergency',
  processConfig: {
    degreasingRequired: true,
    cleaningMode: 'with_analysis',
    finalFlushDurationSeconds: 300, // 5 min
    ovenDurationSeconds: 7200, // 2 hours (120 min)
    ovenTargetTempC: 110,
    gillingDurationSeconds: 420, // 7 min
    flowTargetMinLpm: 22.0,
    flowTargetMaxLpm: 26.5,
    pressureTargetBar: 3.0,
    pressureHoldTimeSec: 60,
  },
  intake: {
    componentType: 'heat_exchanger',
    supplierCompanyName: 'Ferrari Competizioni GT',
    supplierContactName: 'Marco Rossi',
    jobOrderNumber: 'WO-2026-0941',
    dateOfEntry: '30 / 09 / 2026',
    inspectorNameOrInitial: 'NM',
    damageCheckStatus: 'PASS',
    protectionCovers: 'metal',
    bungsCapsSupplied: true,
    oRingIdNo: 'OR-70-FKM-22',
    inhousePartNo: 'PS-HEX-940-A',
    drawingNumber: 'DWG-2026-F1-08',
    flowVectorDirectionVerified: true,
    isFirstService: false, // repeat service
    serviceType: 'routine_overhaul',
    lifeNumber: 2,
    hoursInOperation: 3450,
    previousServiceRecordNumber: 'SR-2024-1189',
    comments: 'F1 Power Steering Actuator returned post-Italian GP at Monza. Fluid dynamic pulsation wash, 5-point flow calibration check, and Apex 1.0 particle analysis (Eq. ISO 16232) before Singapore GP.',
    technician: 'N. Malgarotti (Tech ID 402)',
    photos: [
      {
        id: 'p1',
        name: 'Intake_Flange_Inspection_A.svg',
        type: 'image',
        url: generateTechnicalSchematicSvg('Intake Flange Condition', 'SN-8842-HP · Minor soot near Port B · No warping', '#0284c7'),
        uploadedAt: '2026-09-30T08:20:00.000Z',
        caption: 'Port B Flange intake condition check',
        stage: 'intake',
      },
      {
        id: 'p2',
        name: 'Serial_Plate_Verification.svg',
        type: 'image',
        url: generateTechnicalSchematicSvg('Nameplate & Serial Barcode', 'SN-8842-HP · Rev C · Stamped 2022', '#0284c7'),
        uploadedAt: '2026-09-30T08:22:00.000Z',
        caption: 'Serial plate verification confirmed matching WO',
        stage: 'intake',
      },
    ],
    videos: [
      {
        id: 'v1',
        name: 'Unit_Rotation_360_Inspection.mp4',
        type: 'video',
        url: 'sample-video',
        uploadedAt: '2026-09-30T08:25:00.000Z',
        caption: '360° visual survey of body housing & port seals',
        stage: 'intake',
      },
    ],
    checklist: [
      { id: 'c1', label: 'Unit tag matches Work Order paperwork', checked: true },
      { id: 'c3', label: 'No visible housing cracks or flange warping', checked: true },
      { id: 'c4', label: 'First service determination verified against depot ERP', checked: true },
      { id: 'c5', label: 'Safety MSDS verified for residue', checked: true },
    ],
    completedAt: '2026-09-30T08:30:00.000Z',
  },
  degreasing: {
    skipped: false,
    tankId: 'TANK-ALPHA-02',
    chemicalType: 'SolvClean EcoHydro-600',
    bathTempC: 58.5,
    soakDurationMinutes: 25,
    soakDurationHours: 0.42,
    visualCleanlinessPass: true,
    technician: 'N. Malgarotti',
    notes: 'Degreased with fluid hydrodynamic circulation for 25 mins (0.42 hrs). Heavy oil film successfully stripped.',
    oilDraining: getDefaultOilDrainData('water_radiator'),
    preFlush: getDefaultPreFlushData('water_radiator'),
    photos: [
      {
        id: 'p-degrease-1',
        name: 'Post_Degrease_Surface.svg',
        type: 'image',
        url: generateTechnicalSchematicSvg('Post-Degrease Chamber Inspection', 'Clean metallic substrate · 0 hydrocarbon residue', '#10b981'),
        uploadedAt: '2026-09-30T08:58:00.000Z',
        caption: 'Clean bore surface post-solvent soak',
        stage: 'degreasing',
      },
    ],
    completedAt: '2026-09-30T09:00:00.000Z',
  },
  firstFlush: {
    performed: true,
    waterTempC: 55,
    targetDurationSeconds: 360,
    durationMinutes: 6,
    durationHours: 0.1,
    remainingSeconds: 0,
    isRunning: false,
    timerCompleted: true,
    deionizeResistivityPass: true,
    soapingAgentEvacuated: true,
    effluentFoamFree: true,
    technician: 'N. Malgarotti',
    notes: 'Single 55°C DI flush executed post room-temp degrease. All foaming surfactant flushed out.',
    completedAt: '2026-09-30T09:12:00.000Z',
  },
  flowTest: {
    benchId: 'FLOW-BENCH-04 (Calibrated)',
    fluidType: 'Deionized Water (DI Water)',
    fluidTempC: 40.2,
    inletFlowLpm: 0,
    outletFlowLpm: 0,
    deltaPressureBar: 0,
    flowPass: false,
    pointsPassThreshold: 3,
    technician: 'N. Malgarotti',
    notes: '',
    completedAt: undefined, // in progress now
    testPoints: getDefaultFlowTestPoints(false, false),
    baselineSource: 'new_unit_birth_record',
  },
  pressureTest: {
    gaugeId: 'DIGI-GAUGE-PG-91 (Cert #9921)',
    testPressureBar: 3.0,
    heldDurationSeconds: 60,
    startPressureBar: 3.0,
    endPressureBar: 3.0,
    allowableDeltaBar: 0.5,
    testResult: 'PENDING',
    leakDetected: false,
    technician: 'N. Malgarotti',
    notes: '',
  },
  cleaning: {
    mode: 'with_analysis',
    detergentAgent: 'Apex V1 Precision Flow Agent',
    flowDynamicsCycleMinutes: 15,
    ultrasonicCycleMinutes: 15,
    bathTemperatureC: 45,
    technician: 'N. Malgarotti',
    notes: '',
    analysisResult: {
      uploadedAt: '',
      reportFiles: [],
      particleCountIso: 'Apex 1.0: 14/12/09',
      gravimetricSolidsMg: 0.8,
      moisturePpm: 35,
      verdict: 'CONFORMING',
      labTechnician: 'L. Weber (Analytical QA)',
      analysisNotes: 'Spectrometric patch test conforms to Apex 1.0 Component Cleanliness Standard (Eq. ISO 16232) & Motorsport Class 5 standards.',
    },
  },
  finalFlush: {
    targetSeconds: 300,
    remainingSeconds: 300,
    isRunning: false,
    timerCompleted: false,
    technician: 'N. Malgarotti',
    notes: 'Pre-filtered rinse fluid at 3 bar circulation with 3-micron absolute filter inline.',
    parameterLabel: 'Flush Fluid Spec',
    parameterValue: 'AeroShell Fluid 41 · 3μm Inline Filter',
  },
  oven: {
    targetSeconds: 7200, remainingSeconds: 7200,
    isRunning: false,
    timerCompleted: false,
    targetTempC: 110,
    actualTempC: 110.4,
    technician: 'N. Malgarotti',
    notes: 'Desiccant heat cure cycle for internal passages.',
    parameterLabel: 'Oven Chamber',
    parameterValue: 'Vacuum Thermal Chamber #3',
  },
  gilling: {
    targetSeconds: 420,
    remainingSeconds: 420,
    elapsedSeconds: 0,
    isRunning: false,
    timerCompleted: false,
    technician: 'N. Malgarotti',
    notes: 'Manual fin straightening and core dressing completed by hand (100% manual benchwork, zero jigs).',
    parameterLabel: 'Manual Fin Straightening Bench',
    parameterValue: 'Bench Station #2 (Manual Hand Craft)',
  },
  signOff: {
    pictures: [],
    inspectorName: 'N. Malgarotti',
    inspectorId: 'TECH-402',
    qaDisposition: 'APPROVED',
    finalComments: 'Bicester workbench overhaul completed conforming to PS-WORKBENCH-QA-2026 specs.',
    afterDryMoistureCheck: 'PASS',
    afterDryVisualDamageCheck: 'PASS',
    afterDryInspectorSign: 'N. Malgarotti',
    inertGasPurgeCompleted: true,
    sealingStatus: 'NEW_PARTICLE_SCIENCE_BUNGS_USED',
    finStraighteningMinutes: 18,
    structuralVerificationAuthorized: true,
    authorizedQualitySign: 'N. Malgarotti (QA Lead)',
    dateApproved: '30 / 09 / 2026',
    formCodeReference: 'PS-WORKBENCH-QA-2026',
    documentControlVersion: 'Version 2.4',
  },
  activityLog: [
    {
      id: 'log-1',
      timestamp: '2026-09-30T08:15:10.000Z',
      stepId: 'intake',
      user: 'N. Malgarotti',
      action: 'Unit intake created',
      details: 'SN-8842-HP registered for routine overhaul. Assessed as Repeat Service (3,450 hrs).',
    },
    {
      id: 'log-2',
      timestamp: '2026-09-30T08:22:45.000Z',
      stepId: 'intake',
      user: 'N. Malgarotti',
      action: 'Attached 2 intake inspection photos & 1 video recording',
      mediaCount: 3,
    },
    {
      id: 'log-3',
      timestamp: '2026-09-30T08:30:12.000Z',
      stepId: 'intake',
      user: 'N. Malgarotti',
      action: 'In-sheet assessment completed & Process configured',
      details: 'Degreasing: REQUIRED · Cleaning Mode: WITH ANALYSIS',
    },
    {
      id: 'log-4',
      timestamp: '2026-09-30T09:00:15.000Z',
      stepId: 'degreasing',
      user: 'N. Malgarotti',
      action: 'Degreasing step completed',
      details: 'Tank ALPHA-02, 25 min soak at 58.5°C. Cleanliness PASS.',
    },
  ],
  delivery: {
    targetDeliveryDate: '2026-09-30T18:00:00.000Z',
    dispatchStatus: 'in_depot',
    priority: 'aog_critical',
    carrier: 'DHL Aviation AOG Express',
    trackingNumber: 'DHL-AOG-8842',
    destinationCity: 'Manchester Airport (MAN)',
    shippingNotes: 'AOG aircraft priority - critical delivery needed.',
  },
};

// Initialize QR code for sample unit
INITIAL_SAMPLE_UNIT.qrCode = generateUnitQrInfoSync(INITIAL_SAMPLE_UNIT);

const rawFleet: ServiceUnit[] = [
  INITIAL_SAMPLE_UNIT,
  {
    id: 'unit-7721',
    serialNumber: 'SN-7721-RR',
    lifeNumber: 1,
    partNumber: 'WEC-ASV-24',
    modelName: 'Hypercar 24h Active Suspension Damper Valve',
    customerName: 'Porsche Penske Motorsport (963)',
    racingCategory: 'wec_hypercar',
    racingType: '24 Hours of Le Mans Endurance',
    chassisNumber: 'Porsche 963 Chassis #04',
    workOrderNumber: 'WO-2026-0922',
    createdAt: '2026-09-28T09:00:00.000Z',
    updatedAt: '2026-09-29T15:30:00.000Z',
    currentStepId: 'sign_off' as StepId,
    overallStatus: 'completed' as const,
    priority: 'high' as UnitPriority,
    processConfig: {
      degreasingRequired: true,
      cleaningMode: 'with_analysis' as const,
      finalFlushDurationSeconds: 300,
      ovenDurationSeconds: 7200,
      ovenTargetTempC: 110,
      gillingDurationSeconds: 420,
      flowTargetMinLpm: 20.0,
      flowTargetMaxLpm: 26.0,
      pressureTargetBar: 180,
      pressureHoldTimeSec: 60,
    },
    intake: {
      isFirstService: true,
      serviceType: 'first_time_assembly' as const,
      lifeNumber: 1,
      hoursInOperation: 0,
      comments: 'New unit OEM baseline intake. All visual criteria conforming.',
      photos: [],
      videos: [],
      technician: 'N. Malgarotti',
      checklist: [
        { id: 'c1', label: 'Unit tag matches Work Order paperwork', checked: true },
        { id: 'c3', label: 'No visible housing cracks or flange warping', checked: true },
        { id: 'c4', label: 'First service determination verified against depot ERP', checked: true },
        { id: 'c5', label: 'Safety MSDS verified for residue', checked: true },
      ],
      completedAt: '2026-09-28T09:30:00.000Z',
    },
    degreasing: {
      skipped: false,
      tankId: 'TANK-ALPHA-01',
      chemicalType: 'SolvClean EcoHydro-600',
      bathTempC: 58.0,
      soakDurationMinutes: 20,
      visualCleanlinessPass: true,
      technician: 'N. Malgarotti',
      notes: 'Standard degreasing cycle complete.',
      photos: [],
      completedAt: '2026-09-28T10:15:00.000Z',
    },
    flowTest: {
      benchId: 'FLOW-BENCH-02',
      fluidType: 'Calibration Oil ISO VG 32',
      fluidTempC: 40.0,
      inletFlowLpm: 25.0,
      outletFlowLpm: 24.8,
      deltaPressureBar: 1.2,
      flowPass: true,
      pointsPassThreshold: 3,
      technician: 'N. Malgarotti',
      notes: 'All 5 points within +/- 15% tolerance bracket.',
      completedAt: '2026-09-28T14:00:00.000Z',
      testPoints: getDefaultFlowTestPoints(true),
      baselineSource: 'new_unit_birth_record',
    },
    pressureTest: {
      gaugeId: 'DIGI-GAUGE-PG-04',
      testPressureBar: 180,
      heldDurationSeconds: 60,
      startPressureBar: 180.0,
      endPressureBar: 180.0,
      allowableDeltaBar: 0.5,
      testResult: 'PASS',
      leakDetected: false,
      technician: 'N. Malgarotti',
      notes: 'Zero decay over 60s hold.',
      completedAt: '2026-09-28T15:30:00.000Z',
    },
    cleaning: {
      mode: 'with_analysis',
      detergentAgent: 'Microson-40',
      ultrasonicCycleMinutes: 15,
      bathTemperatureC: 45,
      technician: 'N. Malgarotti',
      notes: 'Cleaned and dried.',
      completedAt: '2026-09-29T09:00:00.000Z',
      analysisResult: {
        uploadedAt: '2026-09-29T09:10:00.000Z',
        reportFiles: [],
        particleCountIso: 'Apex 1.0: 13/11/08',
        gravimetricSolidsMg: 0.4,
        moisturePpm: 25,
        verdict: 'CONFORMING',
        labTechnician: 'L. Weber',
        analysisNotes: 'Exceptional particulate cleanliness.',
      },
    },
    finalFlush: {
      targetSeconds: 300,
      remainingSeconds: 0,
      isRunning: false,
      timerCompleted: true,
      technician: 'N. Malgarotti',
      notes: 'Completed 5m flush cycle.',
    },
    oven: {
      targetSeconds: 600,
      remainingSeconds: 0,
      isRunning: false,
      timerCompleted: true,
      targetTempC: 110,
      actualTempC: 110.2,
      technician: 'N. Malgarotti',
      notes: 'Bake cycle complete.',
    },
    gilling: {
      targetSeconds: 420,
      remainingSeconds: 0,
      elapsedSeconds: 420,
      isRunning: false,
      timerCompleted: true,
      technician: 'N. Malgarotti',
      notes: 'Cooling complete.',
    },
    signOff: {
      pictures: [],
      inspectorName: 'Quality Lead Tech',
      inspectorId: 'QA-LEAD-01',
      qaDisposition: 'APPROVED',
      completedAt: '2026-09-29T15:30:00.000Z',
      finalComments: 'All calibration parameters verified. Unit released for service.',
    },
    activityLog: [
      {
        id: 'log-rr-1',
        timestamp: '2026-09-28T09:00:00.000Z',
        stepId: 'intake',
        user: 'N. Malgarotti',
        action: 'Unit intake created',
      },
      {
        id: 'log-rr-2',
        timestamp: '2026-09-29T15:30:00.000Z',
        stepId: 'sign_off',
        user: 'QA-LEAD-01',
        action: 'QA Release Approved',
      },
    ],
  },
  {
    id: 'unit-9104',
    serialNumber: 'SN-9104-GE',
    lifeNumber: 2,
    partNumber: 'IC-TWA-10',
    modelName: 'IndyCar Twin-Turbo Dual Wastegate Valve',
    customerName: 'Team Penske IndyCar',
    racingCategory: 'indycar',
    racingType: 'Indianapolis 500 (2.5mi Oval)',
    chassisNumber: 'Dallara IR-18 Car #2 (Josef Newgarden)',
    workOrderNumber: 'WO-2026-0955',
    createdAt: '2026-09-29T11:00:00.000Z',
    updatedAt: '2026-10-01T00:45:00.000Z',
    currentStepId: 'sign_off' as StepId,
    overallStatus: 'completed' as const,
    priority: 'medium' as UnitPriority,
    processConfig: {
      degreasingRequired: true,
      cleaningMode: 'with_analysis' as const,
      finalFlushDurationSeconds: 300,
      ovenDurationSeconds: 7200,
      ovenTargetTempC: 110,
      gillingDurationSeconds: 420,
      flowTargetMinLpm: 22.0,
      flowTargetMaxLpm: 27.0,
      pressureTargetBar: 180,
      pressureHoldTimeSec: 60,
    },
    intake: {
      isFirstService: false,
      serviceType: 'routine_overhaul' as const,
      lifeNumber: 2,
      hoursInOperation: 4200,
      comments: 'Routine overhaul intake from GE commercial fleet.',
      photos: [],
      videos: [],
      technician: 'N. Malgarotti',
      checklist: [
        { id: 'c1', label: 'Unit tag matches Work Order paperwork', checked: true },
        { id: 'c3', label: 'No visible housing cracks or flange warping', checked: true },
        { id: 'c4', label: 'First service determination verified against depot ERP', checked: true },
        { id: 'c5', label: 'Safety MSDS verified for residue', checked: true },
      ],
      completedAt: '2026-09-29T11:30:00.000Z',
    },
    degreasing: {
      skipped: false,
      tankId: 'TANK-ALPHA-02',
      chemicalType: 'SolvClean EcoHydro-600',
      bathTempC: 58.0,
      soakDurationMinutes: 25,
      visualCleanlinessPass: true,
      technician: 'N. Malgarotti',
      notes: 'Clean.',
      photos: [],
      completedAt: '2026-09-29T12:30:00.000Z',
    },
    flowTest: {
      benchId: 'FLOW-BENCH-04',
      fluidType: 'Calibration Oil ISO VG 32',
      fluidTempC: 40.5,
      inletFlowLpm: 24.5,
      outletFlowLpm: 24.3,
      deltaPressureBar: 1.3,
      flowPass: true,
      pointsPassThreshold: 3,
      technician: 'N. Malgarotti',
      notes: 'All points within +/- 15% bracket.',
      completedAt: '2026-09-30T10:00:00.000Z',
      testPoints: getDefaultFlowTestPoints(false),
      baselineSource: 'new_unit_birth_record',
    },
    pressureTest: {
      gaugeId: 'DIGI-GAUGE-PG-91',
      testPressureBar: 180,
      heldDurationSeconds: 60,
      startPressureBar: 180.1,
      endPressureBar: 180.0,
      allowableDeltaBar: 0.5,
      testResult: 'PASS',
      leakDetected: false,
      technician: 'N. Malgarotti',
      notes: 'Pass.',
      completedAt: '2026-09-30T11:15:00.000Z',
    },
    cleaning: {
      mode: 'with_analysis',
      detergentAgent: 'Microson-40',
      ultrasonicCycleMinutes: 15,
      bathTemperatureC: 45,
      technician: 'N. Malgarotti',
      notes: '',
      completedAt: '2026-09-30T14:00:00.000Z',
      analysisResult: {
        uploadedAt: '2026-09-30T14:10:00.000Z',
        reportFiles: [],
        particleCountIso: 'Apex 1.0: 14/12/09',
        gravimetricSolidsMg: 0.6,
        moisturePpm: 30,
        verdict: 'CONFORMING',
        labTechnician: 'L. Weber',
        analysisNotes: 'Conforming to class 5.',
      },
    },
    finalFlush: {
      targetSeconds: 300,
      remainingSeconds: 0,
      isRunning: false,
      timerCompleted: true,
      technician: 'N. Malgarotti',
      notes: 'Rinse completed.',
    },
    oven: {
      targetSeconds: 600,
      remainingSeconds: 0,
      isRunning: false,
      timerCompleted: true,
      targetTempC: 110,
      actualTempC: 110.1,
      technician: 'N. Malgarotti',
      notes: 'Bake done.',
    },
    gilling: {
      targetSeconds: 420,
      remainingSeconds: 0,
      elapsedSeconds: 420,
      isRunning: false,
      timerCompleted: true,
      technician: 'N. Malgarotti',
      notes: 'Done.',
    },
    signOff: {
      pictures: [],
      inspectorName: 'Quality Lead Tech',
      inspectorId: 'QA-LEAD-01',
      qaDisposition: 'APPROVED',
      completedAt: '2026-10-01T00:45:00.000Z',
      finalComments: 'Fully serviced and released this month.',
    },
    activityLog: [
      {
        id: 'log-ge-1',
        timestamp: '2026-09-29T11:00:00.000Z',
        stepId: 'intake',
        user: 'N. Malgarotti',
        action: 'Intake opened',
      },
      {
        id: 'log-ge-2',
        timestamp: '2026-10-01T00:45:00.000Z',
        stepId: 'sign_off',
        user: 'QA-LEAD-01',
        action: 'QA Approved & Stamped',
      },
    ],
  },
  {
    id: 'unit-6330',
    serialNumber: 'SN-6330-SF',
    lifeNumber: 3,
    partNumber: 'WRC-CDV-01',
    modelName: 'Rally1 Electro-Hydraulic Center Diff Valve',
    customerName: 'Toyota Gazoo Racing WRT (Yaris Rally1)',
    racingCategory: 'wrc_rally',
    racingType: 'Rough Gravel & Jump Stages (Rally Finland)',
    chassisNumber: 'GR Yaris Rally1 Chassis #07',
    workOrderNumber: 'WO-2026-0918',
    createdAt: '2026-09-25T14:00:00.000Z',
    updatedAt: '2026-09-27T08:00:00.000Z',
    currentStepId: 'sign_off' as StepId,
    overallStatus: 'completed' as const,
    priority: 'low' as UnitPriority,
    processConfig: {
      degreasingRequired: true,
      cleaningMode: 'with_analysis' as const,
      finalFlushDurationSeconds: 300,
      ovenDurationSeconds: 7200,
      ovenTargetTempC: 110,
      gillingDurationSeconds: 420,
      flowTargetMinLpm: 18.0,
      flowTargetMaxLpm: 24.0,
      pressureTargetBar: 180,
      pressureHoldTimeSec: 60,
    },
    intake: {
      isFirstService: false,
      serviceType: 'routine_overhaul' as const,
      lifeNumber: 3,
      hoursInOperation: 6800,
      comments: 'Safran fleet landing gear actuator valve block.',
      photos: [],
      videos: [],
      technician: 'N. Malgarotti',
      checklist: [
        { id: 'c1', label: 'Unit tag matches Work Order paperwork', checked: true },
        { id: 'c3', label: 'No visible housing cracks or flange warping', checked: true },
        { id: 'c4', label: 'First service determination verified against depot ERP', checked: true },
        { id: 'c5', label: 'Safety MSDS verified for residue', checked: true },
      ],
      completedAt: '2026-09-25T14:30:00.000Z',
    },
    degreasing: {
      skipped: false,
      tankId: 'TANK-ALPHA-01',
      chemicalType: 'SolvClean EcoHydro-600',
      bathTempC: 58.0,
      soakDurationMinutes: 20,
      visualCleanlinessPass: true,
      technician: 'N. Malgarotti',
      notes: 'Pass.',
      photos: [],
      completedAt: '2026-09-25T15:30:00.000Z',
    },
    flowTest: {
      benchId: 'FLOW-BENCH-01',
      fluidType: 'Calibration Oil ISO VG 32',
      fluidTempC: 40.0,
      inletFlowLpm: 24.0,
      outletFlowLpm: 23.9,
      deltaPressureBar: 1.1,
      flowPass: true,
      pointsPassThreshold: 3,
      technician: 'N. Malgarotti',
      notes: 'Passed calibration within +/- 15%.',
      completedAt: '2026-09-26T10:00:00.000Z',
      testPoints: getDefaultFlowTestPoints(false),
      baselineSource: 'new_unit_birth_record',
    },
    pressureTest: {
      gaugeId: 'DIGI-GAUGE-PG-01',
      testPressureBar: 180,
      heldDurationSeconds: 60,
      startPressureBar: 180.0,
      endPressureBar: 180.0,
      allowableDeltaBar: 0.5,
      testResult: 'PASS',
      leakDetected: false,
      technician: 'N. Malgarotti',
      notes: 'Zero leak.',
      completedAt: '2026-09-26T11:00:00.000Z',
    },
    cleaning: {
      mode: 'with_analysis',
      detergentAgent: 'Microson-40',
      ultrasonicCycleMinutes: 15,
      bathTemperatureC: 45,
      technician: 'N. Malgarotti',
      notes: 'Clean.',
      completedAt: '2026-09-26T14:00:00.000Z',
      analysisResult: {
        uploadedAt: '2026-09-26T14:15:00.000Z',
        reportFiles: [],
        particleCountIso: 'Apex 1.0: 13/11/08',
        gravimetricSolidsMg: 0.5,
        moisturePpm: 22,
        verdict: 'CONFORMING',
        labTechnician: 'L. Weber',
        analysisNotes: 'Conforming.',
      },
    },
    finalFlush: {
      targetSeconds: 300,
      remainingSeconds: 0,
      isRunning: false,
      timerCompleted: true,
      technician: 'N. Malgarotti',
      notes: 'Pass.',
    },
    oven: {
      targetSeconds: 600,
      remainingSeconds: 0,
      isRunning: false,
      timerCompleted: true,
      targetTempC: 110,
      actualTempC: 110.0,
      technician: 'N. Malgarotti',
      notes: 'Pass.',
    },
    gilling: {
      targetSeconds: 420,
      remainingSeconds: 0,
      elapsedSeconds: 420,
      isRunning: false,
      timerCompleted: true,
      technician: 'N. Malgarotti',
      notes: 'Pass.',
    },
    signOff: {
      pictures: [],
      inspectorName: 'Quality Lead Tech',
      inspectorId: 'QA-LEAD-01',
      qaDisposition: 'APPROVED',
      completedAt: '2026-09-27T08:00:00.000Z',
      finalComments: 'Released conforming to customer spec.',
    },
    activityLog: [],
  },
  {
    id: 'unit-4412',
    serialNumber: 'SN-4412-PM',
    lifeNumber: 1,
    partNumber: 'FE-HBR-03',
    modelName: 'Formula E Gen3 Front Brake Regulating Unit',
    customerName: 'TAG Heuer Porsche Formula E Team',
    racingCategory: 'formula_e',
    racingType: 'Urban Street Circuit E-Prix',
    chassisNumber: '99X Electric Gen3 #94 (Pascal Wehrlein)',
    workOrderNumber: 'WO-2026-0960',
    createdAt: '2026-09-30T10:00:00.000Z',
    updatedAt: '2026-09-30T16:00:00.000Z',
    currentStepId: 'oven' as StepId,
    overallStatus: 'in_progress' as const,
    priority: 'high' as UnitPriority,
    processConfig: {
      degreasingRequired: true,
      cleaningMode: 'with_analysis' as const,
      finalFlushDurationSeconds: 300,
      ovenDurationSeconds: 7200,
      ovenTargetTempC: 110,
      gillingDurationSeconds: 420,
      flowTargetMinLpm: 20.0,
      flowTargetMaxLpm: 25.0,
      pressureTargetBar: 180,
      pressureHoldTimeSec: 60,
    },
    intake: {
      isFirstService: true,
      serviceType: 'first_time_assembly' as const,
      lifeNumber: 1,
      hoursInOperation: 0,
      comments: 'Assembly intake for Parker Meggitt.',
      photos: [],
      videos: [],
      technician: 'N. Malgarotti',
      checklist: [
        { id: 'c1', label: 'Unit tag matches Work Order paperwork', checked: true },
        { id: 'c3', label: 'No visible housing cracks or flange warping', checked: true },
        { id: 'c4', label: 'First service determination verified against depot ERP', checked: true },
        { id: 'c5', label: 'Safety MSDS verified for residue', checked: true },
      ],
    },
    degreasing: {
      skipped: false,
      tankId: 'TANK-ALPHA-01',
      chemicalType: 'SolvClean',
      bathTempC: 58,
      soakDurationMinutes: 20,
      visualCleanlinessPass: true,
      technician: 'N. Malgarotti',
      notes: 'Pass.',
      photos: [],
    },
    flowTest: {
      benchId: 'FLOW-BENCH-02',
      fluidType: 'Calibration Oil ISO VG 32',
      fluidTempC: 40.0,
      inletFlowLpm: 24.2,
      outletFlowLpm: 24.1,
      deltaPressureBar: 1.2,
      flowPass: true,
      pointsPassThreshold: 3,
      technician: 'N. Malgarotti',
      notes: 'Pass.',
      testPoints: getDefaultFlowTestPoints(true),
      baselineSource: 'new_unit_birth_record',
    },
    pressureTest: {
      gaugeId: 'DIGI-GAUGE-02',
      testPressureBar: 180,
      heldDurationSeconds: 60,
      startPressureBar: 180.0,
      endPressureBar: 180.0,
      allowableDeltaBar: 0.5,
      testResult: 'PASS',
      leakDetected: false,
      technician: 'N. Malgarotti',
      notes: 'Pass.',
    },
    cleaning: {
      mode: 'with_analysis',
      detergentAgent: 'Microson-40',
      ultrasonicCycleMinutes: 15,
      bathTemperatureC: 45,
      technician: 'N. Malgarotti',
      notes: 'Pass.',
    },
    finalFlush: {
      targetSeconds: 300,
      remainingSeconds: 0,
      isRunning: false,
      timerCompleted: true,
      technician: 'N. Malgarotti',
      notes: 'Done.',
    },
    oven: {
      targetSeconds: 7200, remainingSeconds: 5400,
      isRunning: true,
      timerCompleted: false,
      targetTempC: 110,
      actualTempC: 109.8,
      technician: 'N. Malgarotti',
      notes: 'Bake in progress.',
    },
    gilling: {
      targetSeconds: 420,
      remainingSeconds: 420,
      elapsedSeconds: 0,
      isRunning: false,
      timerCompleted: false,
      technician: 'N. Malgarotti',
      notes: '',
    },
    signOff: {
      pictures: [],
      inspectorName: 'Quality Lead Tech',
      inspectorId: 'QA-LEAD-01',
      qaDisposition: 'APPROVED',
      finalComments: '',
    },
    activityLog: [],
  },
  {
    id: 'unit-5520',
    serialNumber: 'SN-5520-AB',
    lifeNumber: 2,
    partNumber: 'F1-BBW-08',
    modelName: 'Brake-By-Wire Electro-Hydraulic Master Block',
    customerName: 'Red Bull Racing Powertrains',
    racingCategory: 'formula1',
    racingType: 'Monocoque Brake-By-Wire (BBW)',
    chassisNumber: 'RB20 Chassis #01 (Car #1)',
    workOrderNumber: 'WO-2026-0934',
    createdAt: '2026-09-29T08:30:00.000Z',
    updatedAt: '2026-09-30T14:15:00.000Z',
    currentStepId: 'sign_off' as StepId,
    overallStatus: 'completed' as const,
    priority: 'medium' as UnitPriority,
    processConfig: {
      degreasingRequired: true,
      cleaningMode: 'with_analysis' as const,
      finalFlushDurationSeconds: 300,
      ovenDurationSeconds: 7200,
      ovenTargetTempC: 110,
      gillingDurationSeconds: 420,
      flowTargetMinLpm: 21.0,
      flowTargetMaxLpm: 25.5,
      pressureTargetBar: 180,
      pressureHoldTimeSec: 60,
    },
    intake: {
      isFirstService: false,
      serviceType: 'routine_overhaul' as const,
      lifeNumber: 2,
      hoursInOperation: 3100,
      comments: 'Routine overhaul for Airbus single-aisle fleet.',
      photos: [],
      videos: [],
      technician: 'N. Malgarotti',
      checklist: [
        { id: 'c1', label: 'Unit tag matches Work Order paperwork', checked: true },
        { id: 'c3', label: 'No visible housing cracks or flange warping', checked: true },
        { id: 'c4', label: 'First service determination verified against depot ERP', checked: true },
        { id: 'c5', label: 'Safety MSDS verified for residue', checked: true },
      ],
      completedAt: '2026-09-29T09:00:00.000Z',
    },
    degreasing: {
      skipped: false,
      tankId: 'TANK-ALPHA-01',
      chemicalType: 'SolvClean',
      bathTempC: 58.0,
      soakDurationMinutes: 20,
      visualCleanlinessPass: true,
      technician: 'N. Malgarotti',
      notes: 'Pass.',
      photos: [],
      completedAt: '2026-09-29T10:00:00.000Z',
    },
    flowTest: {
      benchId: 'FLOW-BENCH-03',
      fluidType: 'Calibration Oil ISO VG 32',
      fluidTempC: 40.0,
      inletFlowLpm: 24.6,
      outletFlowLpm: 24.5,
      deltaPressureBar: 1.3,
      flowPass: true,
      pointsPassThreshold: 3,
      technician: 'N. Malgarotti',
      notes: 'All points passed within +/- 15%.',
      completedAt: '2026-09-29T16:00:00.000Z',
      testPoints: getDefaultFlowTestPoints(false),
      baselineSource: 'new_unit_birth_record',
    },
    pressureTest: {
      gaugeId: 'DIGI-GAUGE-PG-03',
      testPressureBar: 180,
      heldDurationSeconds: 60,
      startPressureBar: 180.0,
      endPressureBar: 180.0,
      allowableDeltaBar: 0.5,
      testResult: 'PASS',
      leakDetected: false,
      technician: 'N. Malgarotti',
      notes: 'Pass.',
      completedAt: '2026-09-30T09:00:00.000Z',
    },
    cleaning: {
      mode: 'with_analysis',
      detergentAgent: 'Microson-40',
      ultrasonicCycleMinutes: 15,
      bathTemperatureC: 45,
      technician: 'N. Malgarotti',
      notes: 'Clean.',
      completedAt: '2026-09-30T10:30:00.000Z',
      analysisResult: {
        uploadedAt: '2026-09-30T10:45:00.000Z',
        reportFiles: [],
        particleCountIso: 'Apex 1.0: 12/10/08',
        gravimetricSolidsMg: 0.3,
        moisturePpm: 20,
        verdict: 'CONFORMING',
        labTechnician: 'L. Weber',
        analysisNotes: 'Conforming.',
      },
    },
    finalFlush: {
      targetSeconds: 300,
      remainingSeconds: 0,
      isRunning: false,
      timerCompleted: true,
      technician: 'N. Malgarotti',
      notes: 'Pass.',
    },
    oven: {
      targetSeconds: 600,
      remainingSeconds: 0,
      isRunning: false,
      timerCompleted: true,
      targetTempC: 110,
      actualTempC: 110.0,
      technician: 'N. Malgarotti',
      notes: 'Pass.',
    },
    gilling: {
      targetSeconds: 420,
      remainingSeconds: 0,
      elapsedSeconds: 420,
      isRunning: false,
      timerCompleted: true,
      technician: 'N. Malgarotti',
      notes: 'Pass.',
    },
    signOff: {
      pictures: [],
      inspectorName: 'Quality Lead Tech',
      inspectorId: 'QA-LEAD-01',
      qaDisposition: 'APPROVED',
      completedAt: '2026-09-30T14:15:00.000Z',
      finalComments: 'Turnaround completed in 29.75 hours. Stamped conforming.',
    },
    activityLog: [],
  },
  {
    id: 'unit-8819',
    serialNumber: 'SN-8819-GT3',
    lifeNumber: 2,
    partNumber: 'GT3-ABS-M5',
    modelName: 'Motorsport Bosch M5 Monoblock ABS Valve Block',
    customerName: 'Manthey EMA (Porsche 911 GT3 R)',
    racingCategory: 'gt3_imsa',
    racingType: '24 Hours of Nürburgring & Spa Endurance',
    chassisNumber: 'Porsche 911 GT3.R Chassis #912',
    workOrderNumber: 'WO-2026-0968',
    createdAt: '2026-10-01T00:15:00.000Z',
    updatedAt: '2026-10-01T00:45:00.000Z',
    currentStepId: 'intake' as StepId,
    overallStatus: 'in_progress' as const,
    priority: 'emergency' as UnitPriority,
    processConfig: {
      degreasingRequired: true,
      cleaningMode: 'with_analysis' as const,
      finalFlushDurationSeconds: 300,
      ovenDurationSeconds: 7200,
      ovenTargetTempC: 110,
      gillingDurationSeconds: 420,
      flowTargetMinLpm: 20.0,
      flowTargetMaxLpm: 25.0,
      pressureTargetBar: 180,
      pressureHoldTimeSec: 60,
    },
    intake: {
      isFirstService: false,
      serviceType: 'routine_overhaul' as const,
      lifeNumber: 2,
      hoursInOperation: 4500,
      comments: 'Received after 24h Nürburgring endurance stint for mid-season depot overhaul.',
      photos: [],
      videos: [],
      technician: 'N. Malgarotti',
      checklist: [
        { id: 'c1', label: 'Unit tag matches Work Order paperwork', checked: true },
        { id: 'c3', label: 'No visible housing cracks or flange warping', checked: false },
        { id: 'c4', label: 'First service determination verified against depot ERP', checked: false },
        { id: 'c5', label: 'Safety MSDS verified for residue', checked: false },
      ],
    },
    degreasing: {
      skipped: false,
      tankId: 'TANK-ALPHA-02',
      chemicalType: 'SolvClean',
      bathTempC: 58,
      soakDurationMinutes: 20,
      visualCleanlinessPass: false,
      technician: 'N. Malgarotti',
      notes: '',
      photos: [],
    },
    firstFlush: getDefaultFirstFlushData('heat_exchanger'),
    flowTest: {
      benchId: 'FLOW-BENCH-01',
      fluidType: 'Calibration Oil ISO VG 32',
      fluidTempC: 40.0,
      inletFlowLpm: 0,
      outletFlowLpm: 0,
      deltaPressureBar: 0,
      flowPass: false,
      pointsPassThreshold: 3,
      technician: 'N. Malgarotti',
      notes: '',
      testPoints: getDefaultFlowTestPoints(false, false),
      baselineSource: 'new_unit_birth_record',
    },
    pressureTest: {
      gaugeId: 'DIGI-GAUGE-01',
      testPressureBar: 180,
      heldDurationSeconds: 60,
      startPressureBar: 0,
      endPressureBar: 0,
      allowableDeltaBar: 0.5,
      testResult: 'PENDING',
      leakDetected: false,
      technician: 'N. Malgarotti',
      notes: '',
    },
    cleaning: {
      mode: 'with_analysis',
      detergentAgent: 'Microson-40',
      ultrasonicCycleMinutes: 15,
      bathTemperatureC: 45,
      technician: 'N. Malgarotti',
      notes: '',
    },
    finalFlush: {
      targetSeconds: 300,
      remainingSeconds: 300,
      isRunning: false,
      timerCompleted: false,
      technician: 'N. Malgarotti',
      notes: '',
    },
    oven: {
      targetSeconds: 7200, remainingSeconds: 7200,
      isRunning: false,
      timerCompleted: false,
      targetTempC: 110,
      actualTempC: 0,
      technician: 'N. Malgarotti',
      notes: '',
    },
    gilling: {
      targetSeconds: 420,
      remainingSeconds: 420,
      elapsedSeconds: 0,
      isRunning: false,
      timerCompleted: false,
      technician: 'N. Malgarotti',
      notes: '',
    },
    signOff: {
      pictures: [],
      inspectorName: 'Quality Lead Tech',
      inspectorId: 'QA-LEAD-01',
      qaDisposition: 'APPROVED',
      finalComments: '',
    },
    activityLog: [],
  },
  {
    id: 'unit-combi-2',
    serialNumber: 'SN-CMB2-8801',
    lifeNumber: 2,
    partNumber: 'F1-CMB-02',
    modelName: 'F1 Dual Comby Matrix (Radiator + Oil Cooler)',
    customerName: 'Mercedes-AMG PETRONAS F1 Team',
    racingCategory: 'formula1',
    racingType: 'Grand Prix & Sprint Weekend',
    chassisNumber: 'W15 Chassis #02 (Car #63)',
    workOrderNumber: 'WO-2026-0982',
    componentType: 'combi_2_unit',
    combiConfig: createDefaultCombiConfig(2, 'SN-CMB2-8801', 'WO-2026-0982'),
    supplierCompanyName: 'Mercedes-AMG High Performance Powertrains',
    supplierContactName: 'James Allison',
    jobOrderNumber: 'WO-2026-0982',
    inhousePartNo: 'PS-CMB-F1-02',
    drawingNumber: 'DWG-2026-CMB-02',
    createdAt: '2026-10-02T08:30:00.000Z',
    updatedAt: '2026-10-02T11:45:00.000Z',
    currentStepId: 'flow_test' as StepId,
    overallStatus: 'in_progress' as const,
    priority: 'high' as UnitPriority,
    processConfig: {
      degreasingRequired: true,
      cleaningMode: 'with_analysis' as const,
      finalFlushDurationSeconds: 300,
      ovenDurationSeconds: 7200,
      ovenTargetTempC: 110,
      gillingDurationSeconds: 420,
      flowTargetMinLpm: 20.0,
      flowTargetMaxLpm: 26.0,
      pressureTargetBar: 180,
      pressureHoldTimeSec: 60,
    },
    intake: {
      isFirstService: false,
      serviceType: 'routine_overhaul' as const,
      lifeNumber: 2,
      hoursInOperation: 2200,
      componentType: 'combi_2_unit',
      supplierCompanyName: 'Mercedes-AMG High Performance Powertrains',
      supplierContactName: 'James Allison',
      jobOrderNumber: 'WO-2026-0982',
      dateOfEntry: '02 / 10 / 2026',
      inspectorNameOrInitial: 'NM',
      damageCheckStatus: 'PASS',
      protectionCovers: 'metal',
      bungsCapsSupplied: true,
      inhousePartNo: 'PS-CMB-F1-02',
      drawingNumber: 'DWG-2026-CMB-02',
      flowVectorDirectionVerified: true,
      comments: 'Dual Comby unit (Water Radiator Core + Engine Oil Cooler Core) received for overhaul. Independent flow & pressure test verification required for both circuits.',
      photos: [],
      videos: [],
      technician: 'N. Malgarotti',
      checklist: [
        { id: 'c1', label: 'Unit tag matches Work Order paperwork', checked: true },
        { id: 'c3', label: 'No visible housing cracks or flange warping', checked: true },
        { id: 'c4', label: 'First service determination verified against depot ERP', checked: true },
        { id: 'c5', label: 'Safety MSDS verified for residue', checked: true },
      ],
      completedAt: '2026-10-02T09:00:00.000Z',
    },
    degreasing: {
      skipped: false,
      tankId: 'TANK-ALPHA-01',
      chemicalType: 'SolvClean EcoHydro-600',
      bathTempC: 58.0,
      soakDurationMinutes: 25,
      visualCleanlinessPass: true,
      technician: 'N. Malgarotti',
      notes: 'Degreased with fluid hydrodynamic circulation.',
      photos: [],
      completedAt: '2026-10-02T10:00:00.000Z',
    },
    flowTest: {
      benchId: 'FLOW-BENCH-02 (Calibrated)',
      fluidType: 'Dual Medium Bench',
      fluidTempC: 45.0,
      inletFlowLpm: 24.8,
      outletFlowLpm: 24.6,
      deltaPressureBar: 1.1,
      flowPass: true,
      pointsPassThreshold: 3,
      technician: 'N. Malgarotti',
      notes: 'Dual circuit testing: Unit 1 (Water Radiator) & Unit 2 (Oil Cooler) both conforming.',
      testPoints: getDefaultFlowTestPoints(false),
      baselineSource: 'new_unit_birth_record',
    },
    pressureTest: {
      gaugeId: 'DIGI-GAUGE-PG-91',
      testPressureBar: 16.0,
      heldDurationSeconds: 60,
      startPressureBar: 16.0,
      endPressureBar: 16.0,
      allowableDeltaBar: 0.2,
      testResult: 'PENDING',
      leakDetected: false,
      technician: 'N. Malgarotti',
      notes: '',
    },
    cleaning: {
      mode: 'with_analysis',
      detergentAgent: 'Microson-40',
      ultrasonicCycleMinutes: 15,
      bathTemperatureC: 45,
      technician: 'N. Malgarotti',
      notes: '',
    },
    finalFlush: {
      targetSeconds: 300,
      remainingSeconds: 300,
      isRunning: false,
      timerCompleted: false,
      technician: 'N. Malgarotti',
      notes: '',
    },
    oven: {
      targetSeconds: 7200, remainingSeconds: 7200,
      isRunning: false,
      timerCompleted: false,
      targetTempC: 110,
      actualTempC: 0,
      technician: 'N. Malgarotti',
      notes: '',
    },
    gilling: {
      targetSeconds: 420,
      remainingSeconds: 420,
      elapsedSeconds: 0,
      isRunning: false,
      timerCompleted: false,
      technician: 'N. Malgarotti',
      notes: '',
    },
    signOff: {
      pictures: [],
      inspectorName: 'Quality Lead Tech',
      inspectorId: 'QA-LEAD-01',
      qaDisposition: 'APPROVED',
      finalComments: '',
    },
    activityLog: [],
  },
  {
    id: 'unit-combi-3',
    serialNumber: 'SN-CMB3-9930',
    lifeNumber: 1,
    partNumber: 'WEC-CMB-03',
    modelName: 'Hypercar Triple Comby Matrix (Rad + Oil + Gearbox)',
    customerName: 'Ferrari AF Corse (499P Hypercar)',
    racingCategory: 'wec_hypercar',
    racingType: '24 Hours of Le Mans Endurance',
    chassisNumber: 'Ferrari 499P Chassis #03 (Car #83)',
    workOrderNumber: 'WO-2026-0995',
    componentType: 'combi_3_unit',
    combiConfig: createDefaultCombiConfig(3, 'SN-CMB3-9930', 'WO-2026-0995'),
    supplierCompanyName: 'Ferrari Competizioni GT',
    supplierContactName: 'Ferdinando Cannizzo',
    jobOrderNumber: 'WO-2026-0995',
    inhousePartNo: 'PS-CMB-WEC-03',
    drawingNumber: 'DWG-2026-CMB-03',
    createdAt: '2026-10-02T14:00:00.000Z',
    updatedAt: '2026-10-02T16:30:00.000Z',
    currentStepId: 'pressure_test' as StepId,
    overallStatus: 'in_progress' as const,
    priority: 'emergency' as UnitPriority,
    processConfig: {
      degreasingRequired: true,
      cleaningMode: 'with_analysis' as const,
      finalFlushDurationSeconds: 300,
      ovenDurationSeconds: 7200,
      ovenTargetTempC: 110,
      gillingDurationSeconds: 420,
      flowTargetMinLpm: 20.0,
      flowTargetMaxLpm: 26.0,
      pressureTargetBar: 180,
      pressureHoldTimeSec: 60,
    },
    intake: {
      isFirstService: true,
      serviceType: 'first_time_assembly' as const,
      lifeNumber: 1,
      hoursInOperation: 0,
      componentType: 'combi_3_unit',
      supplierCompanyName: 'Ferrari Competizioni GT',
      supplierContactName: 'Ferdinando Cannizzo',
      jobOrderNumber: 'WO-2026-0995',
      dateOfEntry: '02 / 10 / 2026',
      inspectorNameOrInitial: 'NM',
      damageCheckStatus: 'PASS',
      protectionCovers: 'metal',
      bungsCapsSupplied: true,
      inhousePartNo: 'PS-CMB-WEC-03',
      drawingNumber: 'DWG-2026-CMB-03',
      flowVectorDirectionVerified: true,
      comments: 'Triple Comby unit (Water Radiator + Engine Oil Cooler + Gearbox Cooler) for Le Mans. All 3 sub-units require individual flow calibration and hydrostatic pressure testing.',
      photos: [],
      videos: [],
      technician: 'N. Malgarotti',
      checklist: [
        { id: 'c1', label: 'Unit tag matches Work Order paperwork', checked: true },
        { id: 'c3', label: 'No visible housing cracks or flange warping', checked: true },
        { id: 'c4', label: 'First service determination verified against depot ERP', checked: true },
        { id: 'c5', label: 'Safety MSDS verified for residue', checked: true },
      ],
      completedAt: '2026-10-02T14:30:00.000Z',
    },
    degreasing: {
      skipped: false,
      tankId: 'TANK-ALPHA-01',
      chemicalType: 'SolvClean EcoHydro-600',
      bathTempC: 58.0,
      soakDurationMinutes: 20,
      visualCleanlinessPass: true,
      technician: 'N. Malgarotti',
      notes: 'Triple core degreased thoroughly.',
      photos: [],
      completedAt: '2026-10-02T15:15:00.000Z',
    },
    flowTest: {
      benchId: 'FLOW-BENCH-03 (Calibrated)',
      fluidType: 'Multi-Core Calibration Bench',
      fluidTempC: 45.0,
      inletFlowLpm: 22.0,
      outletFlowLpm: 21.8,
      deltaPressureBar: 1.0,
      flowPass: true,
      pointsPassThreshold: 3,
      technician: 'N. Malgarotti',
      notes: 'All 3 sub-units (Unit 1, Unit 2, Unit 3) passed 5-point flow test across drive frequencies.',
      testPoints: getDefaultFlowTestPoints(true),
      baselineSource: 'new_unit_birth_record',
      completedAt: '2026-10-02T16:00:00.000Z',
    },
    pressureTest: {
      gaugeId: 'DIGI-GAUGE-PG-91',
      testPressureBar: 16.0,
      heldDurationSeconds: 60,
      startPressureBar: 16.0,
      endPressureBar: 16.0,
      allowableDeltaBar: 0.2,
      testResult: 'PENDING',
      leakDetected: false,
      technician: 'N. Malgarotti',
      notes: '',
    },
    cleaning: {
      mode: 'with_analysis',
      detergentAgent: 'Microson-40',
      ultrasonicCycleMinutes: 15,
      bathTemperatureC: 45,
      technician: 'N. Malgarotti',
      notes: '',
    },
    finalFlush: {
      targetSeconds: 300,
      remainingSeconds: 300,
      isRunning: false,
      timerCompleted: false,
      technician: 'N. Malgarotti',
      notes: '',
    },
    oven: {
      targetSeconds: 7200, remainingSeconds: 7200,
      isRunning: false,
      timerCompleted: false,
      targetTempC: 110,
      actualTempC: 0,
      technician: 'N. Malgarotti',
      notes: '',
    },
    gilling: {
      targetSeconds: 420,
      remainingSeconds: 420,
      elapsedSeconds: 0,
      isRunning: false,
      timerCompleted: false,
      technician: 'N. Malgarotti',
      notes: '',
    },
    signOff: {
      pictures: [],
      inspectorName: 'Quality Lead Tech',
      inspectorId: 'QA-LEAD-01',
      qaDisposition: 'APPROVED',
      finalComments: '',
    },
    activityLog: [],
  },
  {
    id: 'unit-historic-1',
    serialNumber: 'SN-HST-1972',
    lifeNumber: 4,
    partNumber: 'HST-RAD-70',
    modelName: 'Classic DFV Marston Water Radiator Core',
    customerName: 'Classic Team Lotus',
    racingCategory: 'historic',
    racingType: 'Masters Historic Formula One (DFV Era)',
    chassisNumber: 'Lotus 72D Chassis #7 (Car #1)',
    workOrderNumber: 'WO-2026-0720',
    componentType: 'water_radiator',
    supplierCompanyName: 'Classic Team Lotus Heritage',
    supplierContactName: 'Clive Chapman',
    jobOrderNumber: 'WO-2026-0720',
    inhousePartNo: 'PS-HST-RAD-72',
    drawingNumber: 'DWG-1972-LOTUS-72',
    createdAt: '2026-10-01T09:30:00.000Z',
    updatedAt: '2026-10-02T11:00:00.000Z',
    currentStepId: 'degreasing' as StepId,
    overallStatus: 'in_progress' as const,
    priority: 'standard' as UnitPriority,
    processConfig: {
      degreasingRequired: true,
      cleaningMode: 'with_analysis' as const,
      finalFlushDurationSeconds: 300,
      ovenDurationSeconds: 7200,
      ovenTargetTempC: 105,
      gillingDurationSeconds: 420,
      flowTargetMinLpm: 24.0,
      flowTargetMaxLpm: 32.0,
      pressureTargetBar: 4.0,
      pressureHoldTimeSec: 60,
    },
    intake: {
      isFirstService: false,
      serviceType: 'routine_overhaul' as const,
      lifeNumber: 4,
      hoursInOperation: 18.5,
      componentType: 'water_radiator',
      supplierCompanyName: 'Classic Team Lotus Heritage',
      supplierContactName: 'Clive Chapman',
      jobOrderNumber: 'WO-2026-0720',
      dateOfEntry: '01 / 10 / 2026',
      technician: 'N. Malgarotti',
      inspectorNameOrInitial: 'NM',
      comments: 'Goodwood Revival preparation overhaul. No structural fin damage; minor oil film from paddock warmup.',
      damageCheckStatus: 'PASS' as const,
      protectionCovers: 'metal' as const,
      bungsCapsSupplied: true,
      oRingIdNo: 'OR-HST-VITON-18',
      inhousePartNo: 'PS-HST-RAD-72',
      drawingNumber: 'DWG-1972-LOTUS-72',
      flowVectorDirectionVerified: true,
      photos: [],
      videos: [],
      checklist: [],
      completedAt: '2026-10-01T10:00:00.000Z',
    },
    degreasing: {
      skipped: false,
      tankId: 'TANK-ALPHA-01',
      chemicalType: 'SolvClean EcoHydro-600 (Aluminium Safe)',
      bathTempC: 58,
      soakDurationMinutes: 25,
      soakDurationHours: 0.42,
      visualCleanlinessPass: true,
      technician: 'N. Malgarotti',
      notes: 'Oil draining completed and evacuated. Immersion soak and 2-min port pre-flush + 55°C DI rinse performed.',
      photos: [],
      completedAt: '2026-10-01T11:00:00.000Z',
      oilDraining: getDefaultOilDrainData('water_radiator'),
      preFlush: getDefaultPreFlushData('water_radiator'),
    },
    firstFlush: getDefaultFirstFlushData('water_radiator'),
    flowTest: {
      benchId: 'FLOW-BENCH-02',
      fluidType: 'Deionized Water (DI Water)',
      fluidTempC: 50.0,
      inletFlowLpm: 0,
      outletFlowLpm: 0,
      deltaPressureBar: 0,
      flowPass: false,
      pointsPassThreshold: 3,
      technician: 'N. Malgarotti',
      notes: '',
      testPoints: getDefaultFlowTestPoints(false, false),
      baselineSource: 'new_unit_birth_record',
      completedAt: undefined,
    },
    pressureTest: {
      gaugeId: 'DIGI-GAUGE-PG-02',
      testPressureBar: 3.5,
      heldDurationSeconds: 60,
      startPressureBar: 0,
      endPressureBar: 0,
      allowableDeltaBar: 0.1,
      testResult: 'PENDING',
      leakDetected: false,
      technician: 'N. Malgarotti',
      notes: '',
    },
    cleaning: {
      mode: 'with_analysis' as const,
      detergentAgent: 'Apex V1 Precision Flow Dynamics Fluid',
      flowDynamicsCycleMinutes: 20,
      ultrasonicCycleMinutes: 20,
      bathTemperatureC: 60,
      technician: 'N. Malgarotti',
      notes: 'Historic core flow dynamics pulsed clean.',
      analysisResult: {
        uploadedAt: '2026-10-01T12:00:00.000Z',
        reportFiles: [],
        particleCountIso: '14/12/09',
        gravimetricSolidsMg: 0.08,
        moisturePpm: 12,
        verdict: 'CONFORMING',
        labTechnician: 'N. Malgarotti',
        analysisNotes: 'Cleanliness rating conforms to Apex 1.0 (Eq. ISO 16232).',
      },
    },
    finalFlush: {
      targetSeconds: 300,
      remainingSeconds: 0,
      isRunning: false,
      timerCompleted: true,
      technician: 'N. Malgarotti',
      notes: 'Final flush 0.083 hrs completed.',
    },
    oven: {
      targetSeconds: 7200, remainingSeconds: 7200,
      isRunning: false,
      timerCompleted: false,
      targetTempC: 105,
      actualTempC: 0,
      technician: 'N. Malgarotti',
      notes: '',
    },
    gilling: {
      targetSeconds: 420,
      remainingSeconds: 420,
      elapsedSeconds: 0,
      isRunning: false,
      timerCompleted: false,
      technician: 'N. Malgarotti',
      notes: '',
    },
    signOff: {
      pictures: [],
      inspectorName: 'Quality Lead Tech',
      inspectorId: 'QA-LEAD-01',
      qaDisposition: 'APPROVED',
      finalComments: '',
    },
    activityLog: [],
  },
  {
    id: 'unit-fail-press-01',
    serialNumber: 'SN-9912-FL',
    lifeNumber: 3,
    partNumber: 'SF24-HEX-09',
    modelName: 'F1 Core Oil-to-Water Heat Exchanger',
    customerName: 'Scuderia Ferrari HP',
    customerEmail: 'marco.rossi@scuderiaferrari.com',
    racingCategory: 'formula1',
    racingType: 'Grand Prix & Sprint Weekend',
    chassisNumber: 'SF-24 Chassis #02 (Car #55)',
    workOrderNumber: 'WO-2026-0989',
    componentType: 'heat_exchanger',
    heatExchangerMedium: 'water_to_oil' as HeatExchangerMedium,
    supplierCompanyName: 'Ferrari Competizioni GT',
    supplierContactName: 'Marco Rossi',
    jobOrderNumber: 'WO-2026-0989',
    inhousePartNo: 'PS-HEX-SF24-09',
    drawingNumber: 'DWG-2026-F1-14',
    createdAt: '2026-10-02T10:15:00.000Z',
    updatedAt: '2026-10-02T14:20:00.000Z',
    currentStepId: 'pressure_test' as StepId,
    overallStatus: 'quarantined' as const,
    priority: 'emergency' as UnitPriority,
    processConfig: {
      degreasingRequired: true,
      cleaningMode: 'with_analysis' as const,
      finalFlushDurationSeconds: 300,
      ovenDurationSeconds: 7200,
      ovenTargetTempC: 110,
      gillingDurationSeconds: 420,
      flowTargetMinLpm: 22.0,
      flowTargetMaxLpm: 26.5,
      pressureTargetBar: 5.0,
      pressureHoldTimeSec: 60,
    },
    intake: {
      isFirstService: false,
      serviceType: 'routine_overhaul' as const,
      lifeNumber: 3,
      hoursInOperation: 4120,
      componentType: 'heat_exchanger',
      heatExchangerMedium: 'water_to_oil',
      supplierCompanyName: 'Ferrari Competizioni GT',
      supplierContactName: 'Marco Rossi',
      jobOrderNumber: 'WO-2026-0989',
      dateOfEntry: '02 / 10 / 2026',
      inspectorNameOrInitial: 'NM',
      damageCheckStatus: 'PASS',
      protectionCovers: 'metal',
      bungsCapsSupplied: true,
      oRingIdNo: 'OR-70-FKM-22',
      inhousePartNo: 'PS-HEX-SF24-09',
      drawingNumber: 'DWG-2026-F1-14',
      flowVectorDirectionVerified: true,
      comments: 'Water-to-Oil heat exchanger returned post-Singapore GP for scheduled depot overhaul and pressure qualification.',
      photos: [],
      videos: [],
      technician: 'N. Malgarotti',
      checklist: [
        { id: 'c1', label: 'Unit tag matches Work Order paperwork', checked: true },
        { id: 'c3', label: 'No visible housing cracks or flange warping', checked: true },
        { id: 'c4', label: 'First service determination verified against depot ERP', checked: true },
        { id: 'c5', label: 'Safety MSDS verified for residue', checked: true },
      ],
      completedAt: '2026-10-02T10:45:00.000Z',
    },
    degreasing: {
      skipped: false,
      tankId: 'TANK-ALPHA-02',
      chemicalType: 'SolvClean EcoHydro-600',
      bathTempC: 58.5,
      soakDurationMinutes: 25,
      soakDurationHours: 0.42,
      visualCleanlinessPass: true,
      technician: 'N. Malgarotti',
      notes: 'Degreased with hydrodynamic circulation.',
      photos: [],
      completedAt: '2026-10-02T11:30:00.000Z',
    },
    flowTest: {
      benchId: 'FLOW-BENCH-04 (Calibrated)',
      fluidType: 'Deionized Water (DI Water)',
      fluidTempC: 40.2,
      inletFlowLpm: 24.5,
      outletFlowLpm: 24.3,
      deltaPressureBar: 1.25,
      flowPass: true,
      pointsPassThreshold: 3,
      technician: 'N. Malgarotti',
      notes: 'Flow test passed 5/5 frequency points within ±15%.',
      completedAt: '2026-10-02T13:00:00.000Z',
      testPoints: getDefaultFlowTestPoints(false, true),
      baselineSource: 'new_unit_birth_record',
    },
    pressureTest: {
      gaugeId: 'DIGI-GAUGE-PG-91 (Cert #9921)',
      testPressureBar: 5.0,
      heldDurationSeconds: 60,
      startPressureBar: 5.0,
      endPressureBar: 4.42,
      allowableDeltaBar: 0.2,
      testResult: 'FAIL',
      leakDetected: true,
      technician: 'N. Malgarotti',
      notes: 'FAIL: Hydrostatic pressure drop of 0.58 bar over 60s hold. Micro-porosity stream observed at weld seam junction B under 5 bar water submersion. Unit immediately quarantined.',
      completedAt: '2026-10-02T14:15:00.000Z',
    },
    cleaning: {
      mode: 'with_analysis',
      detergentAgent: 'Apex V1 Precision Flow Agent',
      flowDynamicsCycleMinutes: 15,
      ultrasonicCycleMinutes: 15,
      bathTemperatureC: 45,
      technician: 'N. Malgarotti',
      notes: '',
    },
    finalFlush: {
      targetSeconds: 300,
      remainingSeconds: 300,
      isRunning: false,
      timerCompleted: false,
      technician: 'N. Malgarotti',
      notes: '',
    },
    oven: {
      targetSeconds: 7200, remainingSeconds: 7200,
      isRunning: false,
      timerCompleted: false,
      targetTempC: 110,
      actualTempC: 0,
      technician: 'N. Malgarotti',
      notes: '',
    },
    gilling: {
      targetSeconds: 420,
      remainingSeconds: 420,
      elapsedSeconds: 0,
      isRunning: false,
      timerCompleted: false,
      technician: 'N. Malgarotti',
      notes: '',
    },
    signOff: {
      pictures: [],
      inspectorName: 'N. Malgarotti (QA Lead)',
      inspectorId: 'TECH-402',
      qaDisposition: 'REJECTED',
      finalComments: 'HYDROSTATIC LEAK FAILURE: Unit failed 5.0 bar proof pressure hold (0.58 bar drop). Micro-porosity detected at weld seam B. Quarantined for TIG weld repair.',
      afterDryMoistureCheck: 'FAIL',
      afterDryVisualDamageCheck: 'FAIL',
      afterDryInspectorSign: 'N. Malgarotti',
      inertGasPurgeCompleted: false,
      sealingStatus: 'NEW_PARTICLE_SCIENCE_BUNGS_USED',
      finStraighteningMinutes: 0,
      structuralVerificationAuthorized: false,
      authorizedQualitySign: 'N. Malgarotti (QA Lead)',
      dateApproved: '02 / 10 / 2026',
      formCodeReference: 'PS-WORKBENCH-QA-2026',
      documentControlVersion: 'Version 2.4',
    },
    activityLog: [
      {
        id: 'log-fl-1',
        timestamp: '2026-10-02T10:15:00.000Z',
        stepId: 'intake',
        user: 'N. Malgarotti',
        action: 'Unit intake created',
        details: 'SN-9912-FL registered for routine overhaul. Water to Oil heat exchanger.',
      },
      {
        id: 'log-fl-2',
        timestamp: '2026-10-02T14:15:00.000Z',
        stepId: 'pressure_test',
        user: 'N. Malgarotti',
        action: 'Pressure Test FAILED - Hydrostatic Leak Detected',
        details: 'Pressure decay 0.58 bar > 0.20 bar limit. Micro-porosity at weld seam B. Unit placed in QUARANTINE.',
      },
    ],
  },
  {
    id: 'unit-fail-clean-02',
    serialNumber: 'SN-7733-CL',
    lifeNumber: 1,
    partNumber: 'MCL38-RAD-04',
    modelName: 'Formula 1 Ultra-Light Aluminium Water Radiator',
    customerName: 'McLaren Formula 1 Team',
    customerEmail: 'tech@mclaren.com',
    racingCategory: 'formula1',
    racingType: 'Grand Prix & Sprint Weekend',
    chassisNumber: 'MCL38 Chassis #01 (Car #4)',
    workOrderNumber: 'WO-2026-0974',
    componentType: 'water_radiator',
    supplierCompanyName: 'McLaren Racing Operations',
    supplierContactName: 'Andrea Stella',
    jobOrderNumber: 'WO-2026-0974',
    inhousePartNo: 'PS-RAD-MCL38-04',
    drawingNumber: 'DWG-2026-MCL-04',
    createdAt: '2026-10-02T11:00:00.000Z',
    updatedAt: '2026-10-02T15:00:00.000Z',
    currentStepId: 'cleaning' as StepId,
    overallStatus: 'quarantined' as const,
    priority: 'high' as UnitPriority,
    processConfig: {
      degreasingRequired: true,
      cleaningMode: 'with_analysis' as const,
      finalFlushDurationSeconds: 300,
      ovenDurationSeconds: 7200,
      ovenTargetTempC: 110,
      gillingDurationSeconds: 420,
      flowTargetMinLpm: 24.0,
      flowTargetMaxLpm: 32.0,
      pressureTargetBar: 4.0,
      pressureHoldTimeSec: 60,
    },
    intake: {
      isFirstService: true,
      serviceType: 'first_time_assembly' as const,
      lifeNumber: 1,
      hoursInOperation: 0,
      componentType: 'water_radiator',
      supplierCompanyName: 'McLaren Racing Operations',
      supplierContactName: 'Andrea Stella',
      jobOrderNumber: 'WO-2026-0974',
      dateOfEntry: '02 / 10 / 2026',
      inspectorNameOrInitial: 'NM',
      damageCheckStatus: 'PASS',
      protectionCovers: 'metal',
      bungsCapsSupplied: true,
      oRingIdNo: 'OR-70-FKM-22',
      inhousePartNo: 'PS-RAD-MCL38-04',
      drawingNumber: 'DWG-2026-MCL-04',
      flowVectorDirectionVerified: true,
      comments: 'First-time assembly qualification for McLaren MCL38 main water radiator matrix.',
      photos: [],
      videos: [],
      technician: 'N. Malgarotti',
      checklist: [
        { id: 'c1', label: 'Unit tag matches Work Order paperwork', checked: true },
        { id: 'c3', label: 'No visible housing cracks or flange warping', checked: true },
        { id: 'c4', label: 'First service determination verified against depot ERP', checked: true },
        { id: 'c5', label: 'Safety MSDS verified for residue', checked: true },
      ],
      completedAt: '2026-10-02T11:30:00.000Z',
    },
    degreasing: {
      skipped: false,
      tankId: 'TANK-ALPHA-01',
      chemicalType: 'SolvClean EcoHydro-600',
      bathTempC: 58.0,
      soakDurationMinutes: 20,
      visualCleanlinessPass: true,
      technician: 'N. Malgarotti',
      notes: 'Initial degrease completed.',
      photos: [],
      completedAt: '2026-10-02T12:15:00.000Z',
    },
    flowTest: {
      benchId: 'FLOW-BENCH-02',
      fluidType: 'Deionized Water (DI Water)',
      fluidTempC: 45.0,
      inletFlowLpm: 28.0,
      outletFlowLpm: 27.8,
      deltaPressureBar: 0.85,
      flowPass: true,
      pointsPassThreshold: 3,
      technician: 'N. Malgarotti',
      notes: 'Flow test passed.',
      completedAt: '2026-10-02T13:30:00.000Z',
      testPoints: getDefaultFlowTestPoints(true, true),
      baselineSource: 'new_unit_birth_record',
    },
    pressureTest: {
      gaugeId: 'DIGI-GAUGE-PG-02',
      testPressureBar: 4.0,
      heldDurationSeconds: 60,
      startPressureBar: 4.0,
      endPressureBar: 4.0,
      allowableDeltaBar: 0.1,
      testResult: 'PASS',
      leakDetected: false,
      technician: 'N. Malgarotti',
      notes: 'Pressure test held 4.0 bar zero leak.',
      completedAt: '2026-10-02T14:00:00.000Z',
    },
    cleaning: {
      mode: 'with_analysis',
      detergentAgent: 'Apex V1 Precision Flow Agent',
      flowDynamicsCycleMinutes: 15,
      ultrasonicCycleMinutes: 15,
      bathTemperatureC: 45,
      technician: 'N. Malgarotti',
      notes: 'Cleanliness analysis failed due to gravimetric particle overload.',
      analysisResult: {
        uploadedAt: '2026-10-02T14:45:00.000Z',
        reportFiles: [],
        particleCountIso: 'Apex 1.0: 22/19/16 (FAILED)',
        gravimetricSolidsMg: 5.4,
        moisturePpm: 120,
        verdict: 'REQUIRES_RECLEAN',
        labTechnician: 'L. Weber (Analytical QA)',
        analysisNotes: 'NON-CONFORMING: Gravimetric solids 5.4mg exceeds 3.0mg Apex 1.0 ceiling limit. Optical microscopy identified metallic machining swarf > 250μm inline. Core back-flush & re-cleaning mandated.',
      },
    },
    finalFlush: {
      targetSeconds: 300,
      remainingSeconds: 300,
      isRunning: false,
      timerCompleted: false,
      technician: 'N. Malgarotti',
      notes: '',
    },
    oven: {
      targetSeconds: 7200, remainingSeconds: 7200,
      isRunning: false,
      timerCompleted: false,
      targetTempC: 110,
      actualTempC: 0,
      technician: 'N. Malgarotti',
      notes: '',
    },
    gilling: {
      targetSeconds: 420,
      remainingSeconds: 420,
      elapsedSeconds: 0,
      isRunning: false,
      timerCompleted: false,
      technician: 'N. Malgarotti',
      notes: '',
    },
    signOff: {
      pictures: [],
      inspectorName: 'L. Weber (Analytical QA)',
      inspectorId: 'QA-LAB-02',
      qaDisposition: 'REJECTED',
      finalComments: 'CLEANLINESS REJECTED: Particle mass 5.4mg exceeds 3.0mg max specification. Metallic swarf present in core matrix. Quarantined for ultrasonic re-wash.',
      afterDryMoistureCheck: 'FAIL',
      afterDryVisualDamageCheck: 'PASS',
      afterDryInspectorSign: 'L. Weber',
      inertGasPurgeCompleted: false,
      sealingStatus: 'NEW_PARTICLE_SCIENCE_BUNGS_USED',
      finStraighteningMinutes: 0,
      structuralVerificationAuthorized: false,
      authorizedQualitySign: 'L. Weber (Analytical QA)',
      dateApproved: '02 / 10 / 2026',
      formCodeReference: 'PS-WORKBENCH-QA-2026',
      documentControlVersion: 'Version 2.4',
    },
    activityLog: [
      {
        id: 'log-cl-1',
        timestamp: '2026-10-02T11:00:00.000Z',
        stepId: 'intake',
        user: 'N. Malgarotti',
        action: 'Unit intake created',
        details: 'SN-7733-CL registered for assembly intake.',
      },
      {
        id: 'log-cl-2',
        timestamp: '2026-10-02T14:45:00.000Z',
        stepId: 'cleaning',
        user: 'L. Weber',
        action: 'Cleanliness Analysis FAILED',
        details: 'Gravimetric solids 5.4mg > 3.0mg threshold. Metallic swarf detected. Placed in QUARANTINE.',
      },
    ],
  },
  GUEST_DEMO_FAIL_PRESSURE_UNIT,
  GUEST_DEMO_FAIL_CLEANLINESS_UNIT,
  GUEST_DEMO_INPROGRESS_UNIT,
];

export const DEFAULT_FLEET_UNITS: ServiceUnit[] = rawFleet.map((u) => ({
  ...u,
  qrCode: u.qrCode || generateUnitQrInfoSync(u),
}));

export function createNewUnit(params: {
  serialNumber: string;
  partNumber?: string;
  modelName?: string;
  customerName?: string;
  customerUnitDesignation?: string;
  expectedDeliveryDate?: string;
  racingCategory?: string;
  racingType?: string;
  chassisNumber?: string;
  workOrderNumber?: string;
  technician?: string;
  priority?: UnitPriority;
  componentType?: ComponentType;
  heatExchangerMedium?: HeatExchangerMedium;
  supplierCompanyName?: string;
  supplierContactName?: string;
  jobOrderNumber?: string;
  inhousePartNo?: string;
  drawingNumber?: string;
  isFirstService?: boolean | null;
  serviceType?: 'first_time_assembly' | 'routine_overhaul' | 'warranty_repair' | 'field_failure';
  lifeNumber?: number;
  hoursInOperation?: number;
  comments?: string;
  combiConfig?: CombiConfig;
  protectionCovers?: 'cardboard' | 'metal' | 'plastic' | 'none' | 'other';
  bungsCapsStatus?: 'yes' | 'no' | 'partial';
  boxType?: 'cardboard' | 'bubble_wrap' | 'hard_case' | 'soft_case' | 'wet_box' | 'dry_box' | 'other' | string;
  boxMoisture?: 'dry' | 'wet';
}): ServiceUnit {
  const id = `unit-${Date.now()}`;
  const now = new Date().toISOString();
  const serialNumber = params.serialNumber || `SN-${Math.floor(1000 + Math.random() * 9000)}`;
  const lifeNumber = params.lifeNumber !== undefined
    ? Number(params.lifeNumber)
    : (params.isFirstService === true ? 1 : 2);
  const partNumber = params.partNumber || 'F1-PAS-940';
  const modelName = params.modelName || 'Motorsport High-Pressure Valve Assembly';
  const customerName = params.customerName || 'Scuderia Ferrari HP';
  const customerUnitDesignation = params.customerUnitDesignation || undefined;
  const expectedDeliveryDate = params.expectedDeliveryDate || undefined;
  const racingCategory = params.racingCategory || 'formula1';
  const racingType = params.racingType || 'Grand Prix & Sprint Weekend';
  const chassisNumber = params.chassisNumber || undefined;
  const workOrderNumber = params.workOrderNumber || `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const componentType = params.componentType || 'heat_exchanger';
  const supplierCompanyName = params.supplierCompanyName || customerName;
  const supplierContactName = params.supplierContactName || 'Customer Technical Liaison';
  const jobOrderNumber = params.jobOrderNumber || workOrderNumber;
  const inhousePartNo = params.inhousePartNo || `PS-${componentType.toUpperCase().slice(0, 3)}-${partNumber}`;
  const drawingNumber = params.drawingNumber || 'DWG-2026-F1-08';

  const isCombiType = componentType === 'combi_2_unit' || componentType === 'combi_3_unit';
  const combiConfig = params.combiConfig || (isCombiType
    ? createDefaultCombiConfig(componentType === 'combi_3_unit' ? 3 : 2, serialNumber, workOrderNumber)
    : undefined);

  const bungsStatus = params.bungsCapsStatus || 'yes';
  const bungsSupplied = bungsStatus === 'yes' ? true : bungsStatus === 'partial' ? 'partial' : false;

  const unit: ServiceUnit = {
    id,
    serialNumber,
    lifeNumber,
    partNumber,
    modelName,
    customerName,
    customerUnitDesignation,
    expectedDeliveryDate,
    componentType,
    heatExchangerMedium: params.heatExchangerMedium,
    combiConfig,
    supplierCompanyName,
    supplierContactName,
    jobOrderNumber,
    inhousePartNo,
    drawingNumber,
    racingCategory,
    racingType,
    chassisNumber,
    workOrderNumber,
    createdAt: now,
    updatedAt: now,
    currentStepId: 'intake',
    overallStatus: 'in_progress',
    priority: ((params as any).priority || 'medium') as UnitPriority,
    processConfig: {
      degreasingRequired: true,
      firstFlushRequired: true,
      flowTestRequired: componentType !== 'intercooler',
      pressureTestRequired: true,
      cleaningRequired: true,
      finalFlushRequired: true,
      ovenRequired: true,
      gillingRequired: true,
      cleaningMode: 'with_analysis',
      finalFlushDurationSeconds: 300,
      ovenDurationSeconds: 7200,
      ovenTargetTempC: 110,
      gillingDurationSeconds: 420,
      flowTargetMinLpm: 20.0,
      flowTargetMaxLpm: 25.0,
      pressureTargetBar: getDefaultPressureForComponent(componentType),
      pressureHoldTimeSec: 60,
    },
    intake: {
      componentType,
      heatExchangerMedium: params.heatExchangerMedium,
      supplierCompanyName,
      supplierContactName,
      jobOrderNumber,
      customerUnitDesignation,
      expectedDeliveryDate,
      dateOfEntry: new Date().toLocaleDateString('en-GB'),
      inspectorNameOrInitial: params.technician || 'NM',
      damageCheckStatus: 'PASS',
      protectionCovers: params.protectionCovers || 'metal',
      bungsCapsSupplied: bungsSupplied,
      bungsCapsStatus: bungsStatus,
      boxInspection: {
        boxType: params.boxType || (params.boxMoisture === 'wet' ? 'wet_box' : 'cardboard'),
        condition: (params.boxMoisture === 'wet' || params.boxType === 'wet_box') ? 'wet' : 'intact',
        moistureState: (params.boxMoisture === 'wet' || params.boxType === 'wet_box') ? 'wet' : 'dry',
        notes: (params.boxMoisture === 'wet' || params.boxType === 'wet_box') ? 'Initial box inspection: WET box condition noted on arrival' : 'Initial box inspection upon intake reception (Dry Box)',
        photos: [],
        photoTaken: false,
        inspectedAt: now,
        inspector: params.technician || 'NM',
      },
      oRingIdNo: 'OR-70-FKM-22',
      inhousePartNo,
      drawingNumber,
      flowVectorDirectionVerified: true,
      isFirstService: params.isFirstService !== undefined ? params.isFirstService : null,
      serviceType: params.serviceType || (params.isFirstService ? 'first_time_assembly' : 'routine_overhaul'),
      lifeNumber,
      hoursInOperation: params.hoursInOperation || 0,
      comments: params.comments || '',
      photos: [],
      videos: [],
      technician: params.technician || 'Technician 1',
      checklist: [
        { id: 'c1', label: 'Unit tag matches Work Order paperwork', checked: false },
        { id: 'c3', label: 'No visible housing cracks or flange warping', checked: false },
        { id: 'c4', label: 'First service determination verified against depot ERP', checked: false },
        { id: 'c5', label: 'Safety MSDS verified for residue', checked: false },
      ],
    },
    degreasing: {
      skipped: false,
      tankId: 'TANK-ALPHA-01',
      chemicalType: 'SolvClean EcoHydro-600',
      bathTempC: 55,
      soakDurationMinutes: 20,
      soakDurationHours: 0.33,
      visualCleanlinessPass: false,
      technician: params.technician || 'Technician 1',
      notes: '',
      oilDraining: getDefaultOilDrainData(componentType),
      preFlush: getDefaultPreFlushData(componentType),
      photos: [],
      completedAt: undefined,
    },
    firstFlush: getDefaultFirstFlushData(componentType),
    flowTest: {
      benchId: 'FLOW-BENCH-01',
      fluidType: 'Deionized Water (DI Water)',
      fluidTempC: 40.0,
      inletFlowLpm: 0,
      outletFlowLpm: 0,
      deltaPressureBar: 0,
      flowPass: false,
      pointsPassThreshold: 3,
      technician: params.technician || 'Technician 1',
      notes: '',
      testPoints: getDefaultFlowTestPoints(false).map((p) => ({
        ...p,
        measuredFlowLpm: 0,
        measuredOutletLpm: 0,
        deltaPressureBar: 0,
        passed: false,
        notes: '',
      })),
      baselineSource: 'new_unit_birth_record',
      completedAt: undefined,
    },
    pressureTest: {
      gaugeId: 'DIGI-GAUGE-PG-01',
      testPressureBar: getDefaultPressureForComponent(componentType),
      heldDurationSeconds: 60,
      startPressureBar: getDefaultPressureForComponent(componentType),
      endPressureBar: getDefaultPressureForComponent(componentType),
      allowableDeltaBar: 0.5,
      testResult: 'PENDING',
      leakDetected: false,
      technician: params.technician || 'Technician 1',
      notes: '',
    },
    cleaning: {
      mode: 'with_analysis',
      detergentAgent: 'Apex V1 Precision Flow Agent',
      flowDynamicsCycleMinutes: 15,
      ultrasonicCycleMinutes: 15,
      bathTemperatureC: 45,
      technician: params.technician || 'Technician 1',
      notes: '',
      analysisResult: {
        uploadedAt: '',
        reportFiles: [],
        particleCountIso: 'Apex 1.0: 15/13/10',
        gravimetricSolidsMg: 1.0,
        moisturePpm: 40,
        verdict: 'CONFORMING',
        labTechnician: '',
        analysisNotes: '',
      },
    },
    finalFlush: {
      targetSeconds: 300,
      remainingSeconds: 300,
      isRunning: false,
      timerCompleted: false,
      technician: params.technician || 'Technician 1',
      notes: '',
      parameterLabel: 'Flush Fluid Spec',
      parameterValue: 'Clean Hydraulic Oil · 3μm Filter',
    },
    oven: {
      targetSeconds: 7200, remainingSeconds: 7200,
      isRunning: false,
      timerCompleted: false,
      targetTempC: 110,
      actualTempC: 110,
      technician: params.technician || 'Technician 1',
      notes: '',
      parameterLabel: 'Oven Chamber',
      parameterValue: 'Thermal Chamber #1',
    },
    gilling: {
      targetSeconds: 420,
      remainingSeconds: 420,
      elapsedSeconds: 0,
      isRunning: false,
      timerCompleted: false,
      technician: params.technician || 'Technician 1',
      notes: '',
      parameterLabel: 'Manual Fin Straightening Bench',
      parameterValue: 'Manual Hand Bench (No Jig)',
    },
    signOff: {
      pictures: [],
      inspectorName: params.technician || 'Inspector',
      inspectorId: 'TECH-01',
      qaDisposition: 'APPROVED',
      finalComments: '',
      afterDryMoistureCheck: 'PASS',
      afterDryVisualDamageCheck: 'PASS',
      afterDryInspectorSign: params.technician || 'NM',
      inertGasPurgeCompleted: true,
      sealingStatus: 'NEW_PARTICLE_SCIENCE_BUNGS_USED',
      finStraighteningMinutes: 15,
      structuralVerificationAuthorized: true,
      authorizedQualitySign: params.technician || 'NM (Lead QA)',
      dateApproved: new Date().toLocaleDateString('en-GB'),
      formCodeReference: 'PS-WORKBENCH-QA-2026',
      documentControlVersion: 'Version 2.4',
    },
    activityLog: [
      {
        id: `log-${Date.now()}`,
        timestamp: now,
        stepId: 'intake',
        user: params.technician || 'Technician',
        action: 'New unit intake sheet initialized',
        details: `Unit ${serialNumber} created with auto-generated tracking QR code.`,
      },
    ],
    delivery: {
      targetDeliveryDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      dispatchStatus: 'in_depot',
      priority: 'standard',
      carrier: 'DHL AeroExpress',
      trackingNumber: `EXP-${serialNumber.replace('SN-', '')}`,
      destinationCity: 'Client Depot Hub',
    },
  };

  // Automatically generate unique QR code for the new unit
  unit.qrCode = generateUnitQrInfoSync(unit);

  return unit;
}

export function loadAllUnits(): ServiceUnit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const hasInitialized = localStorage.getItem('depot_fleet_initialized');
      if (hasInitialized === 'true') {
        return [];
      }
      localStorage.setItem('depot_fleet_initialized', 'true');
      saveAllUnits(DEFAULT_FLEET_UNITS);
      return DEFAULT_FLEET_UNITS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      // If list is empty or empty array, stop automatically creating units
      return [];
    }
    // Migration: ensure every unit has testPoints and uses +/- 15% tolerance bracket and has QR code
    const migrated = parsed.map((unitItem: ServiceUnit) => {
      let u = unitItem;
      if (u.lifeNumber === undefined) {
        u = {
          ...u,
          lifeNumber: u.intake?.lifeNumber ?? (u.intake?.isFirstService ? 1 : 2),
        };
      }
      // Auto-attach QR code with compact {"unit","lifeNumber"} payload
      if (!u.qrCode || !u.qrCode.dataUrl || !u.qrCode.payload || !u.qrCode.payload.includes('"lifeNumber"')) {
        u = {
          ...u,
          qrCode: generateUnitQrInfoSync(u),
        };
      }
      if (!u.flowTest?.testPoints || u.flowTest.testPoints.length < 5) {
        return {
          ...u,
          flowTest: {
            ...u.flowTest,
            testPoints: getDefaultFlowTestPoints(u.intake?.isFirstService === true),
            baselineSource: u.flowTest?.baselineSource || 'new_unit_birth_record',
          },
        };
      }
      // Ensure toleranceBandLpm reflects +/- 15% and has frequencyHz
      const defaultHz = [20, 30, 40, 50, 60];
      const updatedPoints = u.flowTest.testPoints.map((pt, idx) => {
        const tolBand = Number((pt.targetFlowLpm * 0.15).toFixed(2));
        const diff = Math.abs(pt.measuredFlowLpm - pt.targetFlowLpm);
        return {
          ...pt,
          frequencyHz: pt.frequencyHz || defaultHz[idx] || 50,
          tolerancePercent: 15,
          toleranceBandLpm: tolBand,
          passed: pt.measuredFlowLpm > 0 ? diff <= tolBand : false,
        };
      });

      const passingCount = updatedPoints.filter((p) => p.passed && p.measuredFlowLpm > 0).length;
      const isFlowCompleted = !!u.flowTest?.completedAt;

      // Ensure firstFlush object exists on every unit
      if (!u.firstFlush) {
        u = {
          ...u,
          firstFlush: getDefaultFirstFlushData(u.componentType),
        };
      }
      if (u.gilling && u.gilling.elapsedSeconds === undefined) {
        const tgt = u.gilling.targetSeconds || 420;
        const rem = u.gilling.remainingSeconds ?? tgt;
        u = {
          ...u,
          gilling: {
            ...u.gilling,
            elapsedSeconds: Math.max(0, tgt - rem),
          },
        };
      }
      // Migrate any legacy ISO 16232 / 4406 references to Apex 1.0 standard
      if (u.cleaning?.analysisResult?.particleCountIso && (u.cleaning.analysisResult.particleCountIso.includes('16232') || u.cleaning.analysisResult.particleCountIso.includes('4406'))) {
        u = {
          ...u,
          cleaning: {
            ...u.cleaning,
            analysisResult: {
              ...u.cleaning.analysisResult,
              particleCountIso: u.cleaning.analysisResult.particleCountIso
                .replace(/ISO 16232:/g, 'Apex 1.0:')
                .replace(/ISO 4406:/g, 'Apex 1.0:')
                .replace(/16232/g, 'Apex 1.0'),
              analysisNotes: (u.cleaning.analysisResult.analysisNotes || '').replace(/ISO 16232/g, 'Apex 1.0 (Eq. ISO 16232)'),
            },
          },
        };
      }

      // Migrate legacy Lufthansa unit if stored in user's browser
      if (u.customerName === 'Lufthansa Technik' || u.serialNumber === 'SN-8819-LH') {
        u = {
          ...u,
          customerName: 'Manthey EMA (Porsche 911 GT3 R)',
          serialNumber: 'SN-8819-GT3',
          partNumber: 'GT3-ABS-M5',
          modelName: 'Motorsport Bosch M5 Monoblock ABS Valve Block',
        };
      }

      // Ensure motorsport category and racing type are present
      let rCat = u.racingCategory;
      let rType = u.racingType;
      let rChassis = u.chassisNumber;
      if (!rCat) {
        const cLow = (u.customerName || '').toLowerCase();
        if (cLow.includes('ferrari') || cLow.includes('red bull') || cLow.includes('mercedes') || cLow.includes('mclaren') || cLow.includes('williams') || cLow.includes('alpine') || cLow.includes('sauber') || cLow.includes('haas')) {
          rCat = 'formula1';
          rType = rType || 'Grand Prix & Sprint Weekend';
          rChassis = rChassis || 'SF-24 Chassis #03 (Car #16)';
        } else if ((cLow.includes('penske') && !cLow.includes('indycar')) || cLow.includes('wec') || cLow.includes('le mans') || (cLow.includes('toyota') && !cLow.includes('wrt'))) {
          rCat = 'wec_hypercar';
          rType = rType || '24 Hours of Le Mans Endurance';
          rChassis = rChassis || 'Porsche 963 Chassis #04';
        } else if (cLow.includes('indycar') || cLow.includes('ganassi') || cLow.includes('andretti')) {
          rCat = 'indycar';
          rType = rType || 'Indianapolis 500 (2.5mi Oval)';
          rChassis = rChassis || 'Dallara IR-18 Car #2';
        } else if (cLow.includes('rally') || cLow.includes('wrc') || cLow.includes('hyundai')) {
          rCat = 'wrc_rally';
          rType = rType || 'Rough Gravel & Jump Stages (Rally Finland)';
          rChassis = rChassis || 'GR Yaris Rally1 Chassis #07';
        } else if (cLow.includes('formula e') || cLow.includes('jaguar') || cLow.includes('tag heuer')) {
          rCat = 'formula_e';
          rType = rType || 'Urban Street Circuit E-Prix';
          rChassis = rChassis || '99X Electric Gen3 #94';
        } else if (cLow.includes('gt3') || cLow.includes('imsa') || cLow.includes('manthey') || cLow.includes('corvette')) {
          rCat = 'gt3_imsa';
          rType = rType || '24 Hours of Daytona GTD Pro';
          rChassis = rChassis || 'Porsche 911 GT3 R #911';
        } else if (cLow.includes('ducati') || cLow.includes('motogp') || cLow.includes('ktm') || cLow.includes('aprilia')) {
          rCat = 'motogp';
          rType = rType || 'MotoGP Grand Prix & Sprint';
          rChassis = rChassis || 'Desmosedici GP24 #63';
        } else {
          rCat = 'formula1';
          rType = rType || 'Grand Prix & Sprint Weekend';
          rChassis = rChassis || 'F1 Monocoque Chassis #02';
        }
      }

      // Ensure Bicester Workbench Check-In (IN) and Dispatch (OUT) fields are populated
      const compType = u.componentType || u.intake?.componentType || 'heat_exchanger';
      const supplierComp = u.supplierCompanyName || u.intake?.supplierCompanyName || u.customerName;
      const supplierContact = u.supplierContactName || u.intake?.supplierContactName || 'Customer Technical Liaison';
      const jobOrder = u.jobOrderNumber || u.intake?.jobOrderNumber || u.workOrderNumber;
      const inhousePart = u.inhousePartNo || u.intake?.inhousePartNo || `PS-${compType.toUpperCase().slice(0, 3)}-${u.partNumber}`;
      const drawing = u.drawingNumber || u.intake?.drawingNumber || 'DWG-2026-F1-08';

      const TECH_ROSTER: Record<string, string> = {
        'unit-8842': 'N. Malgarotti',
        'unit-7721': 'S. Vettel',
        'unit-9104': 'M. Schumacher',
        'unit-6330': 'A. Newey',
        'unit-4412': 'L. Hamilton',
        'unit-5520': 'M. Verstappen',
        'unit-3310': 'L. Norris',
        'unit-2209': 'F. Alonso',
      };
      const assignedTech = TECH_ROSTER[u.id] || (u.intake?.technician && u.intake.technician !== 'Technician 1' ? u.intake.technician : 'N. Malgarotti');

      const enrichedIntake = {
        ...u.intake,
        componentType: compType,
        supplierCompanyName: supplierComp,
        supplierContactName: supplierContact,
        jobOrderNumber: jobOrder,
        technician: assignedTech,
        dateOfEntry: u.intake?.dateOfEntry || new Date(u.createdAt).toLocaleDateString('en-GB') || '02 / 10 / 2026',
        inspectorNameOrInitial: u.intake?.inspectorNameOrInitial || assignedTech || 'NM',
        damageCheckStatus: u.intake?.damageCheckStatus || 'PASS',
        protectionCovers: u.intake?.protectionCovers || 'metal',
        bungsCapsSupplied: u.intake?.bungsCapsSupplied !== undefined ? u.intake.bungsCapsSupplied : true,
        oRingIdNo: u.intake?.oRingIdNo || 'OR-70-FKM-22',
        inhousePartNo: inhousePart,
        drawingNumber: drawing,
        flowVectorDirectionVerified: u.intake?.flowVectorDirectionVerified !== undefined ? u.intake.flowVectorDirectionVerified : true,
      };

      const enrichedSignOff = {
        ...u.signOff,
        inspectorName: assignedTech,
        afterDryMoistureCheck: u.signOff?.afterDryMoistureCheck || 'PASS',
        afterDryVisualDamageCheck: u.signOff?.afterDryVisualDamageCheck || 'PASS',
        afterDryInspectorSign: u.signOff?.afterDryInspectorSign || assignedTech || 'NM',
        inertGasPurgeCompleted: u.signOff?.inertGasPurgeCompleted !== undefined ? u.signOff.inertGasPurgeCompleted : true,
        sealingStatus: u.signOff?.sealingStatus || 'NEW_PARTICLE_SCIENCE_BUNGS_USED',
        structuralVerificationAuthorized: u.signOff?.structuralVerificationAuthorized !== undefined ? u.signOff.structuralVerificationAuthorized : true,
        authorizedQualitySign: u.signOff?.authorizedQualitySign || `${assignedTech} (QA Lead)`,
        dateApproved: u.signOff?.dateApproved || new Date().toLocaleDateString('en-GB') || '02 / 10 / 2026',
        formCodeReference: u.signOff?.formCodeReference || 'PS-WORKBENCH-QA-2026',
        documentControlVersion: u.signOff?.documentControlVersion || 'Version 2.4',
      };

      const enrichedDegreasing = {
        ...u.degreasing,
        oilDraining: {
          ...(u.degreasing?.oilDraining || getDefaultOilDrainData(compType)),
          oilCollectedMl: undefined,
        },
        preFlush: u.degreasing?.preFlush || getDefaultPreFlushData(compType),
        soakDurationHours: u.degreasing?.soakDurationHours || Number(((u.degreasing?.soakDurationMinutes || 25) / 60).toFixed(2)),
      };

      const proofPressure = (u.pressureTest?.testPressureBar && u.pressureTest.testPressureBar !== 180 && u.pressureTest.testPressureBar !== 4.0 && u.pressureTest.testPressureBar !== 16.0)
        ? u.pressureTest.testPressureBar
        : getDefaultPressureForComponent(compType);

      let unitTestPdf = u.cleaning?.testPdf;
      if (!unitTestPdf?.url) {
        try {
          const spec = u.cleaning?.cleaningSpecMicron || 25;
          const tech = u.cleaning?.analysisResult?.labTechnician || u.cleaning?.technician || 'N. Malgarotti (QA Microscopist)';
          const sample = generateSampleRigTestPdf(u, spec, tech);
          unitTestPdf = {
            id: `test-pdf-auto-${u.id}`,
            name: sample.fileName,
            url: sample.dataUrl,
            fileType: 'pdf',
            sizeBytes: sample.sizeBytes,
            uploadedAt: new Date().toISOString(),
            cleanlinessSpec: `${spec}μm Spec`,
            printWithMasterReport: true,
            labNotes: `Certified Ultra Clean RIG Laboratory Test Certificate (${spec}μm rating)`,
          };
        } catch {
          // fallback if pdf generation fails during unit load
        }
      }

      const enrichedCleaning = {
        ...u.cleaning,
        flowDynamicsCycleMinutes: u.cleaning?.flowDynamicsCycleMinutes ?? u.cleaning?.ultrasonicCycleMinutes ?? 15,
        detergentAgent: (u.cleaning?.detergentAgent || 'Apex V1 Precision Flow Agent').replace(/Ultrasonics/gi, 'Flow Dynamics'),
        notes: (u.cleaning?.notes || '').replace(/ultrasonic/gi, 'flow dynamics'),
        testPdf: unitTestPdf,
      };

      const defaultCustEmail = u.customerEmail || getCustomerDefaultEmail(u.customerName);

      return {
        ...u,
        customerEmail: defaultCustEmail,
        supplierContactEmail: u.supplierContactEmail || defaultCustEmail,
        assignedTechnician: u.assignedTechnician || assignedTech,
        componentType: compType,
        supplierCompanyName: supplierComp,
        supplierContactName: supplierContact,
        jobOrderNumber: jobOrder,
        inhousePartNo: inhousePart,
        drawingNumber: drawing,
        processConfig: {
          ...u.processConfig,
          pressureTargetBar: proofPressure,
        },
        intake: {
          ...enrichedIntake,
          incomingPressureTest: enrichedIntake.incomingPressureTest ? {
            ...enrichedIntake.incomingPressureTest,
            testPressureBar: proofPressure,
          } : undefined,
        },
        degreasing: enrichedDegreasing,
        cleaning: enrichedCleaning,
        signOff: enrichedSignOff,
        racingCategory: rCat,
        racingType: rType,
        chassisNumber: rChassis,
        teamTier: u.teamTier || getTeamMetadata(u.customerName).tier,
        teamSubCategory: u.teamSubCategory || getTeamMetadata(u.customerName).subCategory,
        carAllocation: u.carAllocation || getCarAllocationFromChassis(rChassis),
        priority: u.priority || 'medium',
        pressureTest: {
          ...u.pressureTest,
          testPressureBar: proofPressure,
        },
        flowTest: {
          ...u.flowTest,
          fluidType: 'Deionized Water (DI Water)',
          testPoints: updatedPoints,
          pointsPassThreshold: 3,
          flowPass: passingCount >= 3,
        },
      };
    });

    // Ensure missing sample units (including FAIL/Quarantine demo units) are merged into the fleet list
    const existingIds = new Set(migrated.map((u) => u.id));
    const missingDefaults = DEFAULT_FLEET_UNITS.filter((def) => !existingIds.has(def.id));
    const finalUnits = missingDefaults.length > 0 ? [...migrated, ...missingDefaults] : migrated;

    return finalUnits;
  } catch {
    return [];
  }
}

// Helper to create a compacted version of units for localStorage if quota is reached
function createCompactedUnitsForLocalStorage(units: ServiceUnit[]): ServiceUnit[] {
  return units.map((u) => {
    // If photos have heavy base64 strings, retain them in IndexedDB and store lightweight vector references in localStorage cache
    const compactIntakePhotos = (u.intake?.photos || []).map((p) => {
      if (p.url && p.url.length > 5000 && p.url.startsWith('data:image')) {
        return {
          ...p,
          url: generateTechnicalSchematicSvg(p.caption || 'Intake Photo', 'Preserved in Local IndexedDB & Cloud', '#10b981')
        };
      }
      return p;
    });

    const compactBoxPhotos = (u.intake?.boxInspection?.photos || []).map((p) => {
      if (p.url && p.url.length > 5000 && p.url.startsWith('data:image')) {
        return {
          ...p,
          url: generateTechnicalSchematicSvg('Box Inspection', 'Preserved in Local IndexedDB', '#f59e0b')
        };
      }
      return p;
    });

    const compactSignOffPics = (u.signOff?.pictures || []).map((p) => {
      if (p.url && p.url.length > 5000 && p.url.startsWith('data:image')) {
        return {
          ...p,
          url: generateTechnicalSchematicSvg(p.caption || 'QA Picture', 'Preserved in Local IndexedDB', '#06b6d4')
        };
      }
      return p;
    });

    // Prune excessive log history in localStorage cache to last 35 entries (all entries stay preserved in IndexedDB)
    const compactLogs = (u.activityLog || []).slice(-35);

    return {
      ...u,
      intake: {
        ...u.intake,
        photos: compactIntakePhotos,
        boxInspection: u.intake?.boxInspection ? {
          ...u.intake.boxInspection,
          photos: compactBoxPhotos,
        } : undefined,
      },
      signOff: {
        ...u.signOff,
        pictures: compactSignOffPics,
      },
      activityLog: compactLogs,
    };
  });
}

export function saveAllUnits(units: ServiceUnit[]) {
  // 1. Asynchronously persist full-fidelity units (including all photos and full logs) to IndexedDB
  saveUnitsToIdb(units).catch((err) => {
    console.warn('IndexedDB persistence notice:', err);
  });

  // 2. Persist to localStorage for immediate synchronous bootstrap
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
  } catch (err: any) {
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      (err?.message && String(err.message).toLowerCase().includes('quota'));

    if (isQuota) {
      console.info('Depot LocalStorage: Cache quota limit reached. Optimizing local cache while preserving 100% full dataset in IndexedDB & Cloud.');
      try {
        const compacted = createCompactedUnitsForLocalStorage(units);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(compacted));
      } catch (compactErr) {
        // If still constrained, clean up any legacy temporary keys
        try {
          if (typeof localStorage !== 'undefined') {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && (k.startsWith('temp_') || k.startsWith('backup_') || k.includes('_cache_'))) {
                keysToRemove.push(k);
              }
            }
            keysToRemove.forEach((k) => localStorage.removeItem(k));
            const minimal = units.map((u) => ({
              ...u,
              activityLog: (u.activityLog || []).slice(-15),
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
          }
        } catch {
          // Gracefully suppress: IndexedDB has the complete offline dataset and Cloud Firestore has the remote dataset
        }
      }
    } else {
      console.warn('Storage save notice:', err);
    }
  }
}

export function getActiveUnitId(): string {
  return localStorage.getItem(ACTIVE_UNIT_KEY) || '';
}

export function setActiveUnitId(id: string) {
  localStorage.setItem(ACTIVE_UNIT_KEY, id);
}

export function deleteUnitFromStorage(id: string): ServiceUnit[] {
  try {
    const units = loadAllUnits();
    const updated = units.filter((u) => u.id !== id);
    saveAllUnits(updated);
    if (localStorage.getItem(ACTIVE_UNIT_KEY) === id) {
      localStorage.setItem(ACTIVE_UNIT_KEY, updated[0]?.id || '');
    }
    return updated;
  } catch (err) {
    console.error('Failed to delete unit from local storage:', err);
    return [];
  }
}
