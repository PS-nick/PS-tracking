export type StepId =
  | 'intake'
  | 'degreasing'
  | 'descaling'
  | 'first_flush'
  | 'flow_test'
  | 'pressure_test'
  | 'cleaning'
  | 'final_flush'
  | 'oven'
  | 'gilling'
  | 'sign_off';

export interface MediaItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document';
  url: string; // base64 or blob or inline svg
  sizeBytes?: number;
  uploadedAt: string;
  caption?: string;
  stage: StepId;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  stepId: StepId;
  user: string;
  action: string;
  details?: string;
  mediaCount?: number;
}

export interface ProcessConfig {
  degreasingRequired: boolean;
  firstFlushRequired?: boolean;
  flowTestRequired?: boolean;
  pressureTestRequired?: boolean;
  cleaningRequired?: boolean;
  descalingRequired?: boolean; // Stage 06: Descaled Internal Passages Cycle optionality
  finalFlushRequired?: boolean;
  ovenRequired?: boolean;
  gillingRequired?: boolean;
  cleaningMode: 'with_analysis' | 'without_analysis';
  finalFlushDurationSeconds: number; // default: 300 (5m)
  ovenDurationSeconds: number; // default: 7200 (2 hours / 120m)
  ovenTargetTempC: number; // default: 110-120
  gillingDurationSeconds: number; // default: 420 (7m)
  flowTargetMinLpm: number;
  flowTargetMaxLpm: number;
  pressureTargetBar: number;
  pressureHoldTimeSec: number;
}

export type HeatExchangerMedium = 'water_to_oil' | 'oil_to_oil' | 'water_to_air';

export type ComponentType = 
  | 'heat_exchanger' 
  | 'water_radiator' 
  | 'oil_cooler' 
  | 'intercooler'
  | 'combi_2_unit'
  | 'combi_3_unit'
  | string;

export interface CustomCoolerType {
  id: string;
  label: string;
  code: string;
  description: string;
  baseType?: 'water_radiator' | 'oil_cooler' | 'intercooler' | 'heat_exchanger';
  defaultMedium?: string;
  defaultFlowTargetMinLpm?: number;
  defaultFlowTargetMaxLpm?: number;
  defaultPressureTargetBar?: number;
  defaultPressureHoldTimeSec?: number;
  createdAt?: string;
}

export interface CombiSubUnit {
  id: string; // 'unit_1', 'unit_2', 'unit_3'
  unitIndex: number; // 1, 2, 3
  name: string; // e.g. "Unit 1: Water Radiator Core"
  componentType: ComponentType;
  serialNumber?: string;
  flowTest: FlowTestData;
  pressureTest: PressureTestData;
}

export interface CombiConfig {
  isCombi: boolean;
  unitCount: 2 | 3;
  subUnits: CombiSubUnit[];
}

export interface IntakeData {
  isFirstService: boolean | null; // true = First Service, false = Repeat Service
  serviceType: 'first_time_assembly' | 'routine_overhaul' | 'warranty_repair' | 'field_failure';
  lifeNumber?: number;
  hoursInOperation?: number;
  previousServiceRecordNumber?: string;
  comments: string;
  photos: MediaItem[];
  videos: MediaItem[];
  technician: string;
  checklist: {
    id: string;
    label: string;
    checked: boolean;
  }[];
  completedAt?: string;

  // Bicester Workbench Check-In Sheet (PS-WORKBENCH-QA-2026) - IN Fields
  componentType?: ComponentType;
  heatExchangerMedium?: HeatExchangerMedium;
  supplierCompanyName?: string;
  supplierContactName?: string;
  supplierContactEmail?: string;
  customerEmail?: string;
  jobOrderNumber?: string;
  dateOfEntry?: string; // e.g. "02 / 10 / 2026"
  inspectorNameOrInitial?: string;
  // Step 1: Initial Inspection: General Damage Check
  damageCheckStatus?: 'PASS' | 'DAMAGE_FOUND';
  damageDetails?: string;
  // Step 2: Core Protection Covers & Port Bungs
  protectionCovers?: 'cardboard' | 'metal' | 'plastic' | 'none' | 'other';
  bungsCapsSupplied?: boolean | 'partial';
  bungsCapsStatus?: 'yes' | 'no' | 'partial';

  // Customer Reference & Delivery SLA
  customerUnitDesignation?: string;
  expectedDeliveryDate?: string;

  // Box & Packaging Intake Inspection (with comprehensive box and packaging details)
  boxInspection?: {
    boxType: 'cardboard' | 'wooden_crate' | 'flight_case' | 'aluminium_case' | 'hard_case' | 'soft_case' | 'bubble_wrap' | 'wet_box' | 'dry_box' | 'other' | string;
    condition?: 'intact' | 'damaged' | 'crushed' | 'tampered' | 'acceptable' | 'wet' | 'dry' | 'ripped';
    moistureState?: 'dry' | 'wet'; // Box moisture condition: "Dry Box" vs "Wet Box"
    securitySealStatus?: 'intact' | 'tampered' | 're_taped' | 'standard_tape';
    internalPackaging?: 'custom_foam' | 'bubble_wrap' | 'loose_fill' | 'molded_pulp' | 'none';
    desiccantStatus?: 'active_dry' | 'saturated' | 'none';
    shockIndicator?: 'intact' | 'tripped' | 'none';
    carrierName?: string;
    trackingNumber?: string;
    boxDimensionsCm?: string;
    grossWeightKg?: number;
    notes?: string;
    photos: MediaItem[];
    photoTaken: boolean;
    inspectedAt?: string;
    inspector?: string;
  };
  // Step 3: Interface O-Rings Verification
  oRingIdNo?: string;
  // Step 4: Connection Fittings Inventory Log
  inhousePartNo?: string;
  // Step 8: Fluid Flow Routing & Vector Alignment Analysis
  drawingNumber?: string;
  flowVectorDirectionVerified?: boolean;
  flowDrawingUrl?: string;
  flowDrawingTitle?: string;
  flowDrawings?: MediaItem[];

  // Incoming Pre-Service Pressure Test & Integrity Verification on Intake
  incomingPressureTest?: {
    performed: boolean;
    testPressureBar: number;
    heldDurationSeconds: number;
    startPressureBar?: number;
    endPressureBar?: number;
    pressureDropBar?: number;
    medium?: 'nitrogen' | 'helium' | 'dry_air' | 'water';
    result?: 'PASS' | 'FAIL' | 'PENDING';
    leakDetected?: boolean;
    technician?: string;
    notes?: string;
    completedAt?: string;
    coreTests?: Record<string, {
      testPressureBar: number;
      heldDurationSeconds: number;
      startPressureBar?: number;
      endPressureBar?: number;
      pressureDropBar?: number;
      result: 'PASS' | 'FAIL' | 'PENDING';
      notes?: string;
    }>;
  };
}

export interface OilDrainData {
  performed: boolean;
  stationId?: string;
  method?: 'gravity_drip' | 'vacuum_scavenge' | 'pneumatic_purge';
  durationHours?: number; // Target / logged duration in hours (e.g. 0.25 hrs = 15m)
  durationMinutes?: number;
  oilCollectedMl?: number;
  oilCondition?: 'clean' | 'dark_used' | 'heavy_sludge' | 'metal_particles' | 'dry_no_residue';
  technician?: string;
  completedAt?: string;
  notes?: string;
  isRunning?: boolean;
  remainingSeconds?: number;
  targetSeconds?: number;
  timerCompleted?: boolean;
  targetEndTimestamp?: number;
}

export interface PortFlushRecord {
  id: string;
  portName: string; // e.g. "Port 1: Inlet", "Port 2: Outlet"
  targetDurationMinutes: number; // 2 minutes flush per port
  targetHours: number; // 0.033 hrs
  flushed: boolean;
  timestamp?: string;
}

export interface PreFlushData {
  performed: boolean;
  // Step 1: 2 minutes flush per port (0.033 hrs)
  portFlushCompleted: boolean;
  portFlushMinutesPerPort: number; // 2 minutes
  ports: PortFlushRecord[];
  // Step 2: 5-minute deionize flush (0.083 hrs)
  deionize5mFlushCompleted?: boolean;
  deionize5mRemainingSeconds?: number;
  deionize5mTargetSeconds?: number;
  deionize5mIsRunning?: boolean;
  // Step 3: 55°C deionized hot water flush (6m for water/intercooler, 10m for oil)
  deionizeFlushCompleted: boolean;
  hotWaterFlushCompleted?: boolean;
  deionizeWaterTempC: number; // 55°C
  deionizeDurationMinutes: number; // 6 mins (water & intercooler) or 10 mins (oil cooler)
  deionizeDurationHours: number; // 0.100 hrs or 0.167 hrs
  deionizeResistivityPass: boolean;
  remainingSeconds?: number;
  targetSeconds?: number;
  isRunning?: boolean;
  timerCompleted?: boolean;
  startedAtTimestamp?: number;
  targetEndTimestamp?: number;
  technician?: string;
  completedAt?: string;
  notes?: string;
}

export interface WithoutDegreaseData {
  washMethod: 'direct_preflush' | 'flow_dynamics_only' | 'ultrasonic_only' | 'deionized_hot_water_only' | 'dry_wipe_scavenge';
  reason: string;
  residualFluidChecked: boolean;
  surfacePass: boolean;
  bypassChemicalBath: boolean;
  technician: string;
  completedAt?: string;
  notes?: string;
}

export interface FirstFlushPhaseData {
  targetSeconds: number;
  remainingSeconds: number;
  isRunning?: boolean;
  timerCompleted?: boolean;
  completedAt?: string;
  targetEndTimestamp?: number;
}

export interface FirstFlushData {
  performed: boolean;
  waterTempC: number; // 55°C deionized hot water
  targetDurationSeconds: number; // e.g. 360 seconds (6 minutes) or per core
  durationMinutes: number;
  durationHours: number;
  remainingSeconds?: number;
  isRunning?: boolean;
  timerCompleted?: boolean;
  targetEndTimestamp?: number;
  deionizeResistivityPass: boolean; // >= 15 MΩ·cm
  soapingAgentEvacuated: boolean; // Complete evacuation of soaping agent / degreaser foaming residue
  effluentFoamFree: boolean; // Sight glass clear, zero soap bubbles or foam
  portsFlushedCount?: number;
  totalPorts?: number;
  technician: string;
  notes?: string;
  completedAt?: string;
  selectedSubUnitId?: string; // 'all' or sub-unit id when Combi unit
  flushedSubUnitIds?: string[]; // IDs of combi sub-units flushed
  // 3-Phase Sub-Timers (Port 1 Powerwash, Port 2 Powerwash, Desoaping Flush)
  activePhase?: 'powerwash_port_1' | 'powerwash_port_2' | 'desoaping';
  phase1PowerwashPort1?: FirstFlushPhaseData;
  phase2PowerwashPort2?: FirstFlushPhaseData;
  phase3Desoaping?: FirstFlushPhaseData;
  // Re-flush capability & drying process
  reflushRequired?: boolean;
  reflushCount?: number;
  reflushReason?: string;
  reflushHistory?: {
    cycleNumber: number;
    timestamp: string;
    durationSeconds: number;
    cleanVerdict: 'PASS' | 'FAIL';
    notes?: string;
  }[];
  dryingProcess?: {
    active: boolean;
    dryingMethod: 'forced_hot_air' | 'dry_nitrogen_blow' | 'vacuum_purge';
    targetSeconds: number;
    remainingSeconds: number;
    isRunning?: boolean;
    timerCompleted?: boolean;
    targetEndTimestamp?: number;
    completedAt?: string;
    coreMoistureEvacuated?: boolean;
    redegreaseRecommended?: boolean;
    redegreaseReason?: string;
  };
}

export interface DegreaseBathTimerData {
  targetSeconds: number; // e.g. 1500 (25 min) or 900 (15 min)
  remainingSeconds: number;
  isRunning: boolean;
  timerCompleted: boolean;
  targetEndTimestamp?: number;
  completedAt?: string;
}

export interface DegreasingData {
  skipped: boolean;
  degreasingMode?: 'with_degreasing' | 'without_degreasing';
  degreasingMethod?: 'room_temp_flow_through' | 'bypass';
  tankId: string; // Flow-Through Rig ID (no immersion bath)
  chemicalType: string;
  bathTempC: number; // Degreaser fluid temp at room temperature (~20-22°C)
  soakDurationMinutes: number; // Flow-through circulation duration
  soakDurationHours?: number;
  isImmersionTank?: boolean; // Always false - ambient flow-through only
  circulationFlowLpm?: number;
  visualCleanlinessPass: boolean;
  technician: string;
  notes: string;
  photos: MediaItem[];
  completedAt?: string;
  bypassReason?: string;
  bypassTechnician?: string;
  // Oil Draining before degreasing
  oilDraining?: OilDrainData;
  // Degrease bath / solvent circulation timer that continues across tabs
  soakTimer?: DegreaseBathTimerData;
  // Legacy / linked preFlush reference for backward compatibility
  preFlush?: PreFlushData;
  // Dedicated protocol fields when executed without chemical degrease
  withoutDegreaseData?: WithoutDegreaseData;
}

export interface FlowTestPoint {
  pointIndex: number; // 1 to 5
  name: string; // e.g. "P1 - Low Idle (20%)", "P2 - Cruise (40%)", etc.
  frequencyHz?: number; // Drive / pump motor frequency in Hz for operator reference (e.g. 20 Hz, 30 Hz, 40 Hz, 50 Hz, 60 Hz)
  targetFlowLpm: number; // Set flow rate (LPM) where flow rate is set
  tolerancePercent?: number; // e.g. 15 for +/- 15%
  toleranceBandLpm: number; // Allowable deviation (+/- L/min)
  measuredFlowLpm: number; // Current test flow (LPM)
  measuredOutletLpm?: number;
  deltaPressureBar?: number; // Measured pressure drop (Bar) where pressure drop varies
  targetDeltaPressureBar?: number; // Target / baseline pressure drop (Bar) at set flow rate
  toleranceBandBar?: number; // Allowable pressure drop tolerance bracket (+/- Bar)
  passed: boolean;
  notes?: string;
}

export interface PreviousFlowTestPoint {
  pointIndex: number;
  name?: string;
  frequencyHz: number;
  measuredFlowLpm: number;
  targetFlowLpm: number;
  deltaPressureBar?: number; // Measured pressure drop (Bar)
  targetDeltaPressureBar?: number;
  passed: boolean;
}

export interface PreviousFlowTestRecord {
  testDate: string;
  serviceRecordNumber?: string;
  lifeNumber?: number;
  runType: 'intake_arrival' | 'previous_overhaul' | 'birth_baseline';
  testPoints: PreviousFlowTestPoint[];
  flowPass: boolean;
  notes?: string;
  technician?: string;
}

export interface FlowTestData {
  benchId: string;
  fluidType: string;
  fluidTempC: number;
  inletFlowLpm: number;
  outletFlowLpm: number;
  deltaPressureBar: number;
  flowPass: boolean; // True if at least 4 of 6 points are within +/- 15% parameters
  pointsPassThreshold?: number; // 4 points within parameters required for overall pass
  technician: string;
  notes: string;
  completedAt?: string;
  testPoints: FlowTestPoint[];
  baselineSource: 'new_unit_birth_record' | 'oem_specification' | 'prior_service_record';
  previousTest?: PreviousFlowTestRecord;
  previousTests?: PreviousFlowTestRecord[];
  isExempt?: boolean; // For Intercooler components (Air-to-Air core does not require liquid flow test)
  exemptReason?: string;
}

export interface GlueRepairData {
  applied: boolean;
  glueType: string; // e.g. 'Loctite EA 9497 High Temp Epoxy', 'Araldite 2014-2 Chemical Resistant', 'Belzona 1111 Super Metal'
  leakLocation: string; // e.g. 'Core tube-to-header joint (Row 3)', 'Port weld toe pinhole', 'End tank crimp joint'
  curingMethod: 'ambient_24h' | 'heat_accelerated_60m' | 'heat_cure_120c' | 'uv_cure';
  cureDurationMinutes: number;
  cureTemperatureC?: number;
  technician: string;
  notes: string;
  repairedAt?: string;
  retestRequired: boolean;
  retestResult?: 'PASS' | 'FAIL' | 'PENDING';
  retestPressureBar?: number;
  retestHeldSeconds?: number;
  retestEndPressureBar?: number;
  retestCompletedAt?: string;
}

export interface PressureTestData {
  gaugeId: string;
  testPressureBar: number;
  medium?: 'Helium' | 'Air' | 'Nitrogen' | 'Water' | string; // Pressure testing fluid / gas medium
  heldDurationSeconds: number;
  startPressureBar: number;
  endPressureBar: number;
  allowableDeltaBar: number;
  testResult: 'PASS' | 'FAIL' | 'PENDING';
  leakDetected: boolean;
  technician: string;
  notes: string;
  completedAt?: string;
  glueRepair?: GlueRepairData;
  // Submerged Water Bath with Gas Flow Through Tubes (5-minute dwell)
  waterBathSubmerged?: boolean;
  waterBathTankId?: string; // e.g. WB-OPTICAL-01
  waterBathTempC?: number; // e.g. 21°C
  gasFlowThroughTubesDurationSeconds?: number; // 300 seconds (5 minutes) standard dwell
  gasFlowTimer?: TimedStepData;
  bubbleCheckVerdict?: 'ZERO_BUBBLES_PASS' | 'BUBBLE_LEAK_FAIL' | 'PENDING';
}

export interface DescalingData {
  performed: boolean;
  skipped?: boolean; // True if descaling is bypassed / not required
  bypassReason?: string; // e.g. "Internal passages clean - chemical descaling not required"
  bypassTechnician?: string;
  descalerAgent?: string; // e.g. "Apex Non-Acidic Precision Descaling Agent"
  cycleMinutes?: number;
  bathTemperatureC?: number;
  technician: string;
  notes?: string;
  completedAt?: string;
}

export interface CleaningData {
  mode: 'with_analysis' | 'without_analysis';
  detergentAgent: string;
  cleaningSpecMicron?: number | 'custom'; // Ultra Fine RIG Cleaning specs: 5, 10, 25, 50, 100, 200 micron or custom
  customCleaningSpecMicron?: number;
  flowDynamicsCycleMinutes?: number;
  ultrasonicCycleMinutes?: number;
  bathTemperatureC: number;
  technician: string;
  notes: string;
  completedAt?: string;
  skipped?: boolean;
  bypassReason?: string;
  bypassTechnician?: string;
  // Analysis specific fields (Microscope particle count — zero gravimetric technology)
  analysisResult?: {
    uploadedAt: string;
    reportFiles: MediaItem[];
    particleCountIso: string; // e.g. "Apex 1.0: 15/13/10 (Eq. ISO 16232)"
    maxParticleSizeMicron?: number | 'custom'; // Standard: 5, 10, 25, 50, 100, 200, or 'custom'
    customParticleSizeMicron?: number;
    effectiveParticleSizeMicron?: number; // e.g. 5, 10, 25, 50, 100, 200, or custom value
    actualParticleCount?: number; // Measured particle count under digital optical microscope
    maxAllowableCount?: number; // Maximum permissible particles at that micron threshold (e.g. 0)
    microscopeMethod?: string; // Digital optical microscope (100x-500x polarized)
    gravimetricSolidsMg?: number; // Legacy optional field (gravimetric technology not used)
    moisturePpm: number;
    verdict: 'CONFORMING' | 'CONTAMINATED' | 'REQUIRES_RECLEAN';
    labTechnician: string;
    analysisNotes: string;
  };
  // Uploaded PDF Test Certificate / Lab Document from Ultra Clean RIG
  testPdf?: {
    id: string;
    name: string;
    url: string; // data URL (base64)
    fileType?: 'pdf' | 'image' | 'document';
    sizeBytes?: number;
    uploadedAt: string;
    caption?: string;
    cleanlinessSpec?: string;
    printWithMasterReport?: boolean; // Controls whether this PDF is appended to Master Report print
    labNotes?: string;
  };
}

export interface TimedStepData {
  targetSeconds: number;
  remainingSeconds: number;
  elapsedSeconds?: number;
  isRunning: boolean;
  timerCompleted: boolean;
  completedAt?: string;
  technician: string;
  notes: string;
  targetEndTimestamp?: number; // Wall-clock timestamp (ms) for resilient background/cross-window countdown
  startedAtTimestamp?: number; // Wall-clock timestamp (ms) for resilient up-time tracking
  // Specific metadata
  parameterLabel?: string;
  parameterValue?: string;
}

export interface SignOffData {
  pictures: MediaItem[];
  signatureDataUrl?: string;
  inspectorName: string;
  inspectorId: string;
  qaDisposition: 'APPROVED' | 'CONDITIONAL_APPROVAL' | 'REJECTED';
  completedAt?: string;
  finalComments: string;

  // Bicester Workbench Quality Validation Log (PS-WORKBENCH-QA-2026) - OUT Fields
  // Step 13: After Dry Quality Inspection
  afterDryMoistureCheck?: 'PASS' | 'FAIL';
  afterDryVisualDamageCheck?: 'PASS' | 'FAIL';
  afterDryInspectorSign?: string;
  // Step 14: Component Purge & Terminal Port Sealing
  inertGasPurgeCompleted?: boolean;
  sealingStatus?: 'ORIGINAL_CAPS_REUSED' | 'NEW_PARTICLE_SCIENCE_BUNGS_USED';
  // Step 15: Fin Straightening Time Scale Log
  finStraighteningMinutes?: number;
  // Step 16: Final Internal Sign-Off & Clearance Release
  structuralVerificationAuthorized?: boolean;
  authorizedQualitySign?: string;
  dateApproved?: string; // e.g. "02 / 10 / 2026"
  formCodeReference?: string; // "PS-WORKBENCH-QA-2026"
  documentControlVersion?: string; // "Version 2.4"
}

export interface UnitQrCodeInfo {
  dataUrl: string;
  payload: string;
  generatedAt: string;
}

export type DeliveryPriority = 'standard' | 'expedited' | 'aog_critical';
export type DispatchStatus = 'in_depot' | 'ready_for_dispatch' | 'dispatched' | 'delivered';
export type UnitPriority = 'low' | 'medium' | 'high' | 'emergency';

export interface DeliveryInfo {
  targetDeliveryDate: string; // ISO date string for promised SLA delivery deadline
  actualDeliveryDate?: string; // ISO date string when shipped/delivered
  dispatchStatus: DispatchStatus;
  priority: DeliveryPriority;
  isOnTime?: boolean; // True if delivered before targetDeliveryDate or currently on schedule
  carrier?: string; // e.g. "DHL AeroExpress", "FedEx Aerospace Priority", "Customer AOG Courier"
  trackingNumber?: string; // e.g. "DHL-984210492"
  destinationCity?: string; // e.g. "Derby, UK", "Toulouse, FR", "Cincinnati, US"
  shippingNotes?: string;
}

export interface ScannedUnitPayload {
  format?: string;
  system?: string;
  id?: string;
  unit?: string;
  serialNumber: string;
  lifeNumber?: number;
  partNumber?: string;
  modelName?: string;
  customerName?: string;
  workOrderNumber?: string;
  componentType?: ComponentType;
  supplierCompanyName?: string;
  supplierContactName?: string;
  jobOrderNumber?: string;
  inhousePartNo?: string;
  drawingNumber?: string;
  racingCategory?: string; // e.g. "formula1", "wec_hypercar", "indycar", "wrc_rally"
  racingType?: string; // e.g. "Grand Prix & Sprint", "24h Le Mans Endurance", "Indy 500 Oval"
  chassisNumber?: string; // e.g. "Chassis #04 (Car #1)"
  teamTier?: 'works' | 'customer'; // Sub-category: Works vs Customer team
  carAllocation?: 'car_1' | 'car_2' | 'spare_rig'; // Sub-category: Car #1, Car #2, Spare
  teamSubCategory?: string; // e.g. "Factory Works Constructor", "Customer Satellite"
  serviceType?: string;
  isFirstService?: boolean | null;
  serviceCycleCount?: number;
  combiConfig?: CombiConfig;
  rawText?: string;
}

export interface ServiceUnit {
  id: string;
  serialNumber: string;
  lifeNumber?: number;
  modelName: string;
  partNumber: string;
  customerName: string;
  customerEmail?: string;
  componentType?: ComponentType;
  heatExchangerMedium?: HeatExchangerMedium;
  combiConfig?: CombiConfig;
  supplierCompanyName?: string;
  supplierContactName?: string;
  supplierContactEmail?: string;
  assignedTechnician?: string;
  jobOrderNumber?: string;
  inhousePartNo?: string;
  drawingNumber?: string;
  racingCategory?: string; // e.g. "formula1", "wec_hypercar", "indycar", "wrc_rally", "formula_e", "gt3_imsa", "motogp"
  racingType?: string; // e.g. "Grand Prix & Sprint", "24 Hours of Le Mans", "Indy 500 Oval", "Rough Gravel Rally"
  chassisNumber?: string; // e.g. "Chassis #04 (Car #1)"
  teamTier?: 'works' | 'customer'; // Sub-category: Works vs Customer team
  carAllocation?: 'car_1' | 'car_2' | 'spare_rig'; // Sub-category: Car #1, Car #2, Spare
  teamSubCategory?: string; // e.g. "Factory Works Constructor", "Customer Satellite"
  workOrderNumber: string;
  customerUnitDesignation?: string; // Customer's internal asset ID / unit designation (e.g. "RAD-LH-04")
  expectedDeliveryDate?: string; // Target delivery date / SLA deadline (e.g. "2026-10-15")
  createdAt: string;
  updatedAt: string;
  currentStepId: StepId;
  overallStatus: 'in_progress' | 'completed' | 'quarantined';
  priority: UnitPriority;
  processConfig: ProcessConfig;
  intake: IntakeData;
  degreasing: DegreasingData;
  descaling?: DescalingData;
  firstFlush?: FirstFlushData;
  flowTest: FlowTestData;
  pressureTest: PressureTestData;
  cleaning: CleaningData;
  finalFlush: TimedStepData;
  oven: TimedStepData & { targetTempC: number; actualTempC: number };
  gilling: TimedStepData;
  signOff: SignOffData;
  activityLog: ActivityEntry[];
  qrCode?: UnitQrCodeInfo;
  delivery?: DeliveryInfo;
  flowDrawingUrl?: string;
  flowDrawingTitle?: string;
  flowDrawings?: MediaItem[];
  isArchived?: boolean;
  archivedAt?: string;
}
