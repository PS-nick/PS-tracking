import QRCode from 'qrcode';
import { StepId } from '../types/process';

export interface StageDefinition {
  id: StepId;
  stageNumber: number;
  stageCode: string; // ST-01 to ST-11
  title: string;
  stationName: string;
  sopCode: string;
  description: string;
  badgeColor: string;
  accentHex: string;
  equipment: string;
  primaryAction: string;
}

export const STAGE_DEFINITIONS: Record<StepId, StageDefinition> = {
  intake: {
    id: 'intake',
    stageNumber: 1,
    stageCode: 'ST-01',
    title: 'In-Sheet Intake & Initial Inspection',
    stationName: 'Intake Bay 01 · Inspection & Decontamination',
    sopCode: 'SOP-IN-001',
    description: 'Component receiving, condition assessment, packaging verification, mass recording and decontamination triage.',
    badgeColor: 'border-sky-500/40 bg-sky-500/10 text-sky-400',
    accentHex: '#0284c7',
    equipment: 'Avery Weigh-Tronix Precision Scales, Digital Calipers, Barcode Imager',
    primaryAction: 'Receiving Audit & Decontamination Config',
  },
  degreasing: {
    id: 'degreasing',
    stageNumber: 2,
    stageCode: 'ST-02',
    title: 'Ambient Degreasing & Circulation',
    stationName: 'Chemical Bench 02 · Solvent Flush Rig',
    sopCode: 'SOP-DEG-002',
    description: 'Ambient temperature solvent circulation to dissolve heavy hydrocarbons, engine oils, and cooling fluids.',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    accentHex: '#059669',
    equipment: 'Apex V1 Fluid Circulation Unit, Dual Cartridge Filtration (10μm)',
    primaryAction: 'Room-Temp Circulation Flush',
  },
  descaling: {
    id: 'descaling',
    stageNumber: 3,
    stageCode: 'ST-03',
    title: 'Internal Passages Acid Descale',
    stationName: 'Descaling Tank 03 · Acid Neutralization',
    sopCode: 'SOP-DSC-003',
    description: 'Internal matrix chemical descaling for calcium, scale and particulate crust breakdown, followed by neutralizing rinse.',
    badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    accentHex: '#d97706',
    equipment: 'Automated Recirculation Bath, pH Neutralization Monitor, Flow Manifold',
    primaryAction: 'Internal Tube Descale Cycle',
  },
  first_flush: {
    id: 'first_flush',
    stageNumber: 4,
    stageCode: 'ST-04',
    title: 'First Flush (55°C DI Soaping)',
    stationName: 'DI Wash Station 04 · Heated Flush Line',
    sopCode: 'SOP-FL1-004',
    description: 'High-temperature (55°C) deionized water flushing with technical soap surfactant to remove residual chemistry.',
    badgeColor: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
    accentHex: '#0891b2',
    equipment: 'Heated DI Water Loop (>15 MΩ·cm), Multi-Port Inversion Jigs',
    primaryAction: '55°C DI Soaping Circulation',
  },
  flow_test: {
    id: 'flow_test',
    stageNumber: 5,
    stageCode: 'ST-05',
    title: 'Flow Dynamics Testing & ΔP Calibration',
    stationName: 'Flow Bench 05 · Hydraulic Dynamometer',
    sopCode: 'SOP-FLW-005',
    description: '5-point calibrated flow rate testing (20-60 Hz), differential pressure (ΔP) curve generation and benchmark comparison.',
    badgeColor: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    accentHex: '#2563eb',
    equipment: 'PSTS-FLOW-04 Automated Dynamometer Bench, Endress+Hauser Coriolis Mass Flowmeter',
    primaryAction: '5-Point Flow & Differential Pressure (ΔP)',
  },
  pressure_test: {
    id: 'pressure_test',
    stageNumber: 6,
    stageCode: 'ST-06',
    title: 'High-Pressure Submerged Proof & Hold',
    stationName: 'Pressure Cell 06 · Submerged Water Bath',
    sopCode: 'SOP-PRS-006',
    description: 'Hydrostatic pressure proof envelope testing up to 210 Bar in submerged illuminated water bath for micro-leakage inspection.',
    badgeColor: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400',
    accentHex: '#4f46e5',
    equipment: 'Hydra-Cell High Pressure Intensifier, Submerged Acrylic Test Tank, Calibrated Digital Transducer',
    primaryAction: 'Submerged Envelope Proof & Pressure Hold',
  },
  cleaning: {
    id: 'cleaning',
    stageNumber: 7,
    stageCode: 'ST-07',
    title: 'Ultra Fine RIG & Particle Count',
    stationName: 'Clean Rig Bay 07 · Microscopic Analysis',
    sopCode: 'SOP-CLN-007',
    description: 'Zero gravimetric particle extraction rig with digital optical microscope particle counting down to 5-200μm (ISO 16232 equivalent).',
    badgeColor: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    accentHex: '#7c3aed',
    equipment: 'Ultra Clean RIG, Millipore 47mm Vacuum Membrane Filter, Olympus Digital Microscope Analyzer',
    primaryAction: 'Fluid Particle Extraction & Lab Analysis',
  },
  final_flush: {
    id: 'final_flush',
    stageNumber: 8,
    stageCode: 'ST-08',
    title: 'Final Flush & Decontamination Purge',
    stationName: 'Final Flush Bench 08 · High-Purity DI',
    sopCode: 'SOP-FL2-008',
    description: 'High-velocity reverse and forward deionized purge cycle (300s standard duration) with automatic countdown timer.',
    badgeColor: 'border-teal-500/40 bg-teal-500/10 text-teal-400',
    accentHex: '#0d9488',
    equipment: 'High-Purity 18.2 MΩ·cm DI Generator, Automated Bi-Directional Valve Sequencer',
    primaryAction: 'High-Purity DI Bi-Directional Purge',
  },
  oven: {
    id: 'oven',
    stageNumber: 9,
    stageCode: 'ST-09',
    title: 'Thermal Bakeout & Moisture Desiccation',
    stationName: 'Bakeout Oven 09 · Desiccation Chamber',
    sopCode: 'SOP-OVN-009',
    description: 'Customer & Particle Science standard thermal cycle (110°C - 120°C for 2.0 hours) for complete internal moisture extraction.',
    badgeColor: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
    accentHex: '#e11d48',
    equipment: 'Memmert Industrial Convection Chamber, Eurotherm Programmable PID Ramp Controller',
    primaryAction: 'Controlled Desiccation & Nitrogen Purge',
  },
  gilling: {
    id: 'gilling',
    stageNumber: 10,
    stageCode: 'ST-10',
    title: 'Manual Fin Straightening & Bench Dressing',
    stationName: 'Craft Bench 10 · Precision Hand Dressing',
    sopCode: 'SOP-GIL-010',
    description: '100% manual bench craftsmanship matrix fin pitch dressing and aerodynamic restoration without machine jigs.',
    badgeColor: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
    accentHex: '#ea580c',
    equipment: 'Specialized Hand Gilling Combs, High-Intensity Magnification Inspection Lamps',
    primaryAction: '100% Hand Matrix Fin Alignment (Zero Jigs)',
  },
  sign_off: {
    id: 'sign_off',
    stageNumber: 11,
    stageCode: 'ST-11',
    title: 'Final QA Inspection, Stamping & Release',
    stationName: 'QA Inspection Bay 11 · Release Authority',
    sopCode: 'SOP-SGN-011',
    description: 'Macro photographic evidence verification, port plug sealing, official AS9100D stamp authorization and digital release certificate.',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    accentHex: '#10b981',
    equipment: 'Digital QA Macro Camera, AS9100D Physical & Digital Serialization Stamping Tools',
    primaryAction: 'AS9100D Sign-Off & Official Release',
  },
};

export const ORDERED_STAGES: StageDefinition[] = Object.values(STAGE_DEFINITIONS).sort(
  (a, b) => a.stageNumber - b.stageNumber
);

/**
 * Builds the canonical QR payload for a process stage.
 * Designed to be compact, human-readable, and instantly parseable.
 */
export function generateStageQrPayload(stepId: StepId, options?: { format?: 'prefix' | 'json' }): string {
  const stage = STAGE_DEFINITIONS[stepId];
  if (!stage) return `PSTS:STAGE:${stepId}`;

  if (options?.format === 'json') {
    return JSON.stringify({
      format: 'PSTS_STAGE_V1',
      type: 'stage_login',
      stageId: stage.id,
      stageNum: stage.stageNumber,
      code: stage.stageCode,
      name: stage.title,
      station: stage.stationName,
    });
  }

  // Canonical compact prefix format
  return `PSTS:STAGE:${stepId}`;
}

/**
 * Generates an ultra-crisp vector SVG data URL for a stage station QR code.
 */
export function generateStageQrCodeSvg(
  stepId: StepId,
  options?: { margin?: number; darkColor?: string; lightColor?: string; errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }
): string {
  const payload = generateStageQrPayload(stepId);
  try {
    const qr = QRCode.create(payload, { errorCorrectionLevel: options?.errorCorrectionLevel || 'L' });
    const size = qr.modules.size;
    const margin = options?.margin ?? 1;
    const totalSize = size + margin * 2;
    const data = qr.modules.data;
    const dark = options?.darkColor || '#000000';
    const light = options?.lightColor || '#ffffff';

    let rects = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (data[r * size + c]) {
          rects += `<rect x="${c + margin}" y="${r + margin}" width="1" height="1" fill="${dark}"/>`;
        }
      }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges"><rect width="${totalSize}" height="${totalSize}" fill="${light}"/>${rects}</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch (err) {
    console.error('Stage QR SVG generation failed:', err);
    return '';
  }
}

/**
 * Checks whether raw scanned text represents a stage login QR code.
 * Supports:
 * - PSTS:STAGE:flow_test
 * - STAGE:flow_test
 * - PSTS-STAGE:flow_test
 * - JSON { type: "stage_login", stageId: "flow_test" }
 * - URL like https://...?stage=flow_test
 */
export function parseStageQrPayload(raw: string): {
  stepId: StepId;
  stageInfo: StageDefinition;
  valid: true;
} | null {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.trim();

  const validStepIds: StepId[] = [
    'intake',
    'degreasing',
    'descaling',
    'first_flush',
    'flow_test',
    'pressure_test',
    'cleaning',
    'final_flush',
    'oven',
    'gilling',
    'sign_off',
  ];

  // 1. Check PSTS:STAGE:<id> or STAGE:<id> or PSTS-STAGE:<id>
  const prefixMatch = clean.match(/(?:PSTS[:_-]?)?STAGE[:_\-\s=]([a-zA-Z0-9_]+)/i);
  if (prefixMatch && prefixMatch[1]) {
    const candidate = prefixMatch[1].toLowerCase().replace(/-/g, '_') as StepId;
    if (validStepIds.includes(candidate)) {
      return {
        stepId: candidate,
        stageInfo: STAGE_DEFINITIONS[candidate],
        valid: true,
      };
    }
  }

  // 2. Check direct step ID match (e.g. "flow_test" or "ST-05")
  const directCandidate = clean.toLowerCase().replace(/-/g, '_') as StepId;
  if (validStepIds.includes(directCandidate)) {
    return {
      stepId: directCandidate,
      stageInfo: STAGE_DEFINITIONS[directCandidate],
      valid: true,
    };
  }

  // Check stage codes: "st-01" ... "st-11"
  const codeMatch = clean.match(/^ST[-_]?0?([1-9]|1[01])$/i);
  if (codeMatch && codeMatch[1]) {
    const num = parseInt(codeMatch[1], 10);
    const foundByNum = ORDERED_STAGES.find((s) => s.stageNumber === num);
    if (foundByNum) {
      return {
        stepId: foundByNum.id,
        stageInfo: foundByNum,
        valid: true,
      };
    }
  }

  // 3. Check JSON format
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const parsed = JSON.parse(clean);
      const stageCandidate = (parsed.stageId || parsed.stage || parsed.stepId || '').toLowerCase().replace(/-/g, '_') as StepId;
      if (validStepIds.includes(stageCandidate)) {
        return {
          stepId: stageCandidate,
          stageInfo: STAGE_DEFINITIONS[stageCandidate],
          valid: true,
        };
      }
    } catch {
      // not JSON
    }
  }

  // 4. Check URL with stage param
  try {
    if (clean.includes('stage=')) {
      const urlMatch = clean.match(/[?&#]stage=([a-zA-Z0-9_]+)/i);
      if (urlMatch && urlMatch[1]) {
        const candidate = urlMatch[1].toLowerCase().replace(/-/g, '_') as StepId;
        if (validStepIds.includes(candidate)) {
          return {
            stepId: candidate,
            stageInfo: STAGE_DEFINITIONS[candidate],
            valid: true,
          };
        }
      }
    }
  } catch {}

  return null;
}
