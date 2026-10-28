import { ServiceUnit } from '../types/process';
import { getCustomCustomers } from '../constants/motorsport';
import { UserProfile } from '../context/AuthContext';

export interface CustomerDirectoryEntry {
  email: string;
  customerName: string;
  category: string;
  tier: 'works' | 'customer';
  contactPerson: string;
  phone: string;
  address: string;
  sampleUnitsCount?: number;
  sampleWorkOrders?: string[];
  notes?: string;
  passcode?: string;
}

export const DEFAULT_CUSTOMER_PASSCODE = 'PROTRACE2026!';

/**
 * Validates customer corporate email and passcode
 */
export function verifyCustomerCredentials(email: string, passcode?: string): { 
  valid: boolean; 
  entry?: CustomerDirectoryEntry; 
  error?: string 
} {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return { valid: false, error: 'Please enter your corporate email address.' };
  }

  const cleanPasscode = (passcode || '').trim();
  if (!cleanPasscode) {
    return { valid: false, error: 'Please enter your corporate access passcode.' };
  }

  const entry = DEFAULT_CUSTOMER_ACCOUNTS.find((a) => a.email.toLowerCase() === cleanEmail);
  const expectedPasscode = entry?.passcode || DEFAULT_CUSTOMER_PASSCODE;

  if (cleanPasscode !== expectedPasscode) {
    return { 
      valid: false, 
      error: 'Invalid corporate access passcode. Please check your credentials or contact depot security.' 
    };
  }

  return { valid: true, entry };
}

/**
 * Standard Customer Accounts with pre-configured corporate email addresses
 */
export const DEFAULT_CUSTOMER_ACCOUNTS: CustomerDirectoryEntry[] = [
  {
    email: 'marco.rossi@scuderiaferrari.com',
    customerName: 'Scuderia Ferrari HP',
    category: 'Formula 1',
    tier: 'works',
    contactPerson: 'Marco Rossi (Chassis Dynamics Lead)',
    phone: '+39 0536 949111',
    address: 'Via Abetone Inferiore 4, Maranello, Modena, Italy',
    sampleWorkOrders: ['WO-2026-0941', 'WO-2026-0948', 'WO-2026-0962'],
    notes: 'F1 Grand Prix constructor · Priority emergency turnaround allocated',
    passcode: DEFAULT_CUSTOMER_PASSCODE,
  },
  {
    email: 'alex.schmidt@porsche-motorsport.com',
    customerName: 'Porsche Penske Motorsport (963)',
    category: 'WEC Hypercar',
    tier: 'works',
    contactPerson: 'Alex Schmidt (Power Unit Systems)',
    phone: '+49 711 911-0',
    address: 'Porschestrasse 911, Weissach, Germany',
    sampleWorkOrders: ['WO-2026-0942', 'WO-2026-0955'],
    notes: 'WEC & IMSA GTP Le Mans 24h factory prototype entry',
    passcode: DEFAULT_CUSTOMER_PASSCODE,
  },
  {
    email: 'powertrains@redbullracing.com',
    customerName: 'Red Bull Racing Powertrains',
    category: 'Formula 1',
    tier: 'works',
    contactPerson: 'David Coupland (Hydraulics & Cooling Lead)',
    phone: '+44 1908 279700',
    address: 'Bradbourne Drive, Tilbrook, Milton Keynes, UK',
    sampleWorkOrders: ['WO-2026-0946'],
    notes: 'Milton Keynes PU campus · Ultra-high pressure 210 bar spec',
    passcode: DEFAULT_CUSTOMER_PASSCODE,
  },
  {
    email: 'demo.guest@particlescience.com',
    customerName: 'Guest Evaluation Partner',
    category: 'Demonstration',
    tier: 'customer',
    contactPerson: 'Guest Technical Evaluator',
    phone: '+44 1869 321800',
    address: 'Depot Evaluation Suite, Bicester Motion, Oxfordshire, UK',
    sampleWorkOrders: ['WO-2026-DEMO'],
    notes: 'Dedicated isolated sample unit showcase for system evaluation',
    passcode: DEFAULT_CUSTOMER_PASSCODE,
  },
  {
    email: 'tech@teampenske.com',
    customerName: 'Team Penske IndyCar',
    category: 'IndyCar Series',
    tier: 'works',
    contactPerson: 'Ron Ruzewski (Managing Director)',
    phone: '+1 704 664 2300',
    address: '200 Penske Way, Mooresville, NC, USA',
    sampleWorkOrders: ['WO-2026-0943'],
    notes: 'IndyCar NTT Series Oval & Road Course configuration',
  },
  {
    email: 'wrc@toyotagazooracing.com',
    customerName: 'Toyota Gazoo Racing WRT (Yaris Rally1)',
    category: 'WRC Rally',
    tier: 'works',
    contactPerson: 'Jari-Matti Latvala (Team Principal)',
    phone: '+358 20 743 0000',
    address: 'Jyväskylä Technical Campus, Finland',
    sampleWorkOrders: ['WO-2026-0944'],
    notes: 'World Rally Championship Rally1 gravel durability protocol',
  },
  {
    email: 'racing@thor-motorsport.com',
    customerName: 'THOR',
    category: 'WEC Hypercar',
    tier: 'works',
    contactPerson: 'Marcus Vance (Chief Engineer)',
    phone: '+44 1869 321800',
    address: 'Building 105, Bicester Motion, Oxfordshire, UK',
    sampleWorkOrders: ['WO-2026-0950'],
    notes: 'Hypercar endurance matrix · 24h continuous thermal test',
  },
  {
    email: 'racing@manthey-ema.de',
    customerName: 'Manthey EMA (Porsche 911 GT3 R)',
    category: 'GT3 / IMSA',
    tier: 'works',
    contactPerson: 'Nicolas Raeder (Operations Director)',
    phone: '+49 2691 93380',
    address: 'Rudolf-Diesel-Strasse 11, Meuspath, Nürburgring, Germany',
    sampleWorkOrders: ['WO-2026-0947'],
    notes: 'Nürburgring 24h & DTM GT3 works customer entry',
  },
  {
    email: 'f1@mercedesamgf1.com',
    customerName: 'Mercedes-AMG PETRONAS F1 Team',
    category: 'Formula 1',
    tier: 'works',
    contactPerson: 'Andrew Shovlin (Trackside Engineering)',
    phone: '+44 1280 844000',
    address: 'Brackley Campus, Northamptonshire, UK',
    sampleWorkOrders: ['WO-2026-0949'],
    notes: 'Brackley single-seater works chassis cooling',
  },
  {
    email: 'heritage@classicteamlotus.co.uk',
    customerName: 'Classic Team Lotus',
    category: 'Historic / Heritage',
    tier: 'works',
    contactPerson: 'Clive Chapman (Managing Director)',
    phone: '+44 1953 601311',
    address: 'Potash Lane, Hethel, Norfolk, UK',
    sampleWorkOrders: ['WO-2026-0951'],
    notes: 'Preservation & historic Grand Prix certification',
  },
];

/**
 * Returns a default corporate contact email for a motorsport customer/team
 */
export function getCustomerDefaultEmail(customerName?: string): string {
  if (!customerName) return 'client@motorsport-client.com';
  const cLow = customerName.toLowerCase();
  
  if (cLow.includes('ferrari')) return 'marco.rossi@scuderiaferrari.com';
  if (cLow.includes('porsche') && (cLow.includes('penske') || cLow.includes('963'))) return 'alex.schmidt@porsche-motorsport.com';
  if (cLow.includes('red bull') || cLow.includes('rbpt')) return 'powertrains@redbullracing.com';
  if (cLow.includes('penske') && cLow.includes('indycar')) return 'tech@teampenske.com';
  if (cLow.includes('toyota')) return 'wrc@toyotagazooracing.com';
  if (cLow.includes('thor')) return 'racing@thor-motorsport.com';
  if (cLow.includes('manthey')) return 'racing@manthey-ema.de';
  if (cLow.includes('mercedes')) return 'f1@mercedesamgf1.com';
  if (cLow.includes('lotus')) return 'heritage@classicteamlotus.co.uk';
  if (cLow.includes('mclaren')) return 'engineering@mclaren.com';
  if (cLow.includes('aston martin')) return 'technical@astonmartinf1.com';
  if (cLow.includes('alpine')) return 'racing@alpine-cars.com';
  if (cLow.includes('williams')) return 'operations@williamsf1.com';
  if (cLow.includes('cadillac')) return 'v-series@cadillacracing.com';
  if (cLow.includes('bmw')) return 'motorsport@bmw-m.com';
  if (cLow.includes('ducati')) return 'corse@ducati.com';

  const sanitized = customerName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  return `contact@${sanitized}.com`;
}


/**
 * Pre-configured Workshop Service Technicians
 */
export interface TechnicianPreset {
  name: string;
  email: string;
  role: 'lead_engineer' | 'technician' | 'qa_inspector' | 'admin';
  roleLabel: string;
  badgeColor: string;
  initials: string;
  specialty: string;
}

export const PRESET_TECHNICIANS: TechnicianPreset[] = [
  {
    name: 'Nicola Malgarotti',
    email: 'n.malgarotti@particle-science.com',
    role: 'lead_engineer',
    roleLabel: 'Lead Overhaul Engineer',
    badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    initials: 'NM',
    specialty: 'Workshop Lead · Hydraulic Bench Master · Quality Sign-off',
  },
  {
    name: 'Dave Vance',
    email: 'd.vance@particle-science.com',
    role: 'technician',
    roleLabel: 'Diagnostic & Flow Rig Specialist',
    badgeColor: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    initials: 'DV',
    specialty: 'Flow Rate Dynamometer · Dynamic Rig Cleaning & Micron Optics',
  },
  {
    name: 'Mark Spencer',
    email: 'm.spencer@particle-science.com',
    role: 'qa_inspector',
    roleLabel: 'Senior QA & Conformance Inspector',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    initials: 'MS',
    specialty: 'ISO 17025 Compliance · Burst Pressure Proofing & Sign-off',
  },
  {
    name: 'Sarah Jenkins',
    email: 's.jenkins@particle-science.com',
    role: 'technician',
    roleLabel: 'Thermal & Ultrasonic Technician',
    badgeColor: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
    initials: 'SJ',
    specialty: 'High-Temp Degassing Oven · Fin Gilling & Precision Dressing',
  },
];

/**
 * Strict Constructor Team Brand Matching Definition
 */
interface TeamBrandRule {
  id: string;
  primaryTokens: string[];
  exclusiveTokens?: string[];
  disallowTokens?: string[];
  emails: string[];
  domains: string[];
}

const TEAM_BRAND_RULES: TeamBrandRule[] = [
  {
    id: 'ferrari',
    primaryTokens: ['ferrari', 'scuderia ferrari', 'scuderia', '499p', 'af corse'],
    emails: ['marco.rossi@scuderiaferrari.com', 'client@scuderiaferrari.com'],
    domains: ['scuderiaferrari.com', 'ferrari.com', 'ferrari.it'],
  },
  {
    id: 'porsche_penske',
    primaryTokens: ['porsche penske', 'penske 963', '963', 'porsche motorsport'],
    disallowTokens: ['indycar', 'indy car', 'manthey'],
    emails: ['alex.schmidt@porsche-motorsport.com'],
    domains: ['porsche-motorsport.com', 'porsche.de', 'porsche.com'],
  },
  {
    id: 'red_bull',
    primaryTokens: ['red bull', 'rbpt', 'red bull racing', 'redbull', 'powertrains'],
    emails: ['powertrains@redbullracing.com'],
    domains: ['redbullracing.com', 'redbull.com'],
  },
  {
    id: 'penske_indy',
    primaryTokens: ['penske indycar', 'team penske', 'penske indy', 'indycar'],
    disallowTokens: ['963', 'porsche'],
    emails: ['tech@teampenske.com'],
    domains: ['teampenske.com'],
  },
  {
    id: 'toyota_gazoo',
    primaryTokens: ['toyota', 'gazoo', 'toyota gazoo', 'yaris rally1', 'gr010'],
    emails: ['wrc@toyotagazooracing.com'],
    domains: ['toyotagazooracing.com', 'toyota-motorsport.com'],
  },
  {
    id: 'thor',
    primaryTokens: ['thor', 'thor-motorsport', 'thor hypercar'],
    emails: ['racing@thor-motorsport.com'],
    domains: ['thor-motorsport.com'],
  },
  {
    id: 'manthey',
    primaryTokens: ['manthey', 'manthey ema', 'manthey-ema'],
    emails: ['racing@manthey-ema.de'],
    domains: ['manthey-ema.de', 'manthey-racing.de'],
  },
  {
    id: 'mercedes',
    primaryTokens: ['mercedes', 'mercedes-amg', 'petronas', 'amg petronas'],
    emails: ['f1@mercedesamgf1.com'],
    domains: ['mercedesamgf1.com', 'mercedes-benz.com'],
  },
  {
    id: 'lotus',
    primaryTokens: ['lotus', 'classic team lotus'],
    emails: ['heritage@classicteamlotus.co.uk'],
    domains: ['classicteamlotus.co.uk', 'lotuscars.com'],
  },
  {
    id: 'mclaren',
    primaryTokens: ['mclaren', 'mclaren f1'],
    emails: ['engineering@mclaren.com'],
    domains: ['mclaren.com'],
  },
  {
    id: 'aston_martin',
    primaryTokens: ['aston martin', 'aramco'],
    emails: ['technical@astonmartinf1.com'],
    domains: ['astonmartinf1.com', 'astonmartin.com'],
  },
  {
    id: 'alpine',
    primaryTokens: ['alpine', 'bwt alpine'],
    emails: ['racing@alpine-cars.com'],
    domains: ['alpine-cars.com'],
  },
  {
    id: 'williams',
    primaryTokens: ['williams', 'williams racing'],
    emails: ['operations@williamsf1.com'],
    domains: ['williamsf1.com'],
  },
  {
    id: 'sauber',
    primaryTokens: ['sauber', 'kick sauber'],
    emails: ['racing@sauber-group.com'],
    domains: ['sauber-group.com'],
  },
  {
    id: 'haas',
    primaryTokens: ['haas', 'haas f1'],
    emails: ['team@haasf1team.com'],
    domains: ['haasf1team.com'],
  },
  {
    id: 'cadillac',
    primaryTokens: ['cadillac', 'v-series'],
    emails: ['v-series@cadillacracing.com'],
    domains: ['cadillacracing.com'],
  },
  {
    id: 'bmw',
    primaryTokens: ['bmw', 'bmw-m', 'bmw m'],
    emails: ['motorsport@bmw-m.com'],
    domains: ['bmw-m.com'],
  },
  {
    id: 'ducati',
    primaryTokens: ['ducati', 'ducati corse'],
    emails: ['corse@ducati.com'],
    domains: ['ducati.com'],
  },
];

/**
 * Dedicated demonstration unit for guest evaluations
 */
export const GUEST_DEMO_SAMPLE_UNIT: ServiceUnit = {
  id: 'unit-demo-sample-01',
  serialNumber: 'PSTS-DEMO-SAMPLE-01',
  lifeNumber: 1,
  partNumber: 'HEX-W2O-400',
  modelName: 'Thermal Matrix Overhaul Sample (Water to Oil)',
  customerName: 'Guest Evaluation Partner',
  customerEmail: 'demo.guest@particlescience.com',
  racingCategory: 'demonstration',
  racingType: 'Technical Evaluation Suite',
  chassisNumber: 'DEMO-CHASSIS-01',
  workOrderNumber: 'WO-2026-DEMO',
  componentType: 'heat_exchanger',
  heatExchangerMedium: 'water_to_oil',
  supplierCompanyName: 'Particle Science Technologies',
  supplierContactName: 'Guest Technical Evaluator',
  supplierContactEmail: 'demo.guest@particlescience.com',
  assignedTechnician: 'Nicola Malgarotti',
  jobOrderNumber: 'WO-2026-DEMO',
  inhousePartNo: 'PS-HEX-400-DEMO',
  drawingNumber: 'DWG-DEMO-2026',
  createdAt: '2026-09-30T08:00:00.000Z',
  updatedAt: '2026-09-30T16:30:00.000Z',
  currentStepId: 'sign_off',
  overallStatus: 'completed',
  priority: 'medium',
  processConfig: {
    degreasingRequired: true,
    cleaningMode: 'with_analysis',
    finalFlushDurationSeconds: 300,
    ovenDurationSeconds: 7200,
    ovenTargetTempC: 110,
    gillingDurationSeconds: 420,
    flowTargetMinLpm: 22.0,
    flowTargetMaxLpm: 26.5,
    pressureTargetBar: 3.0,
    pressureHoldTimeSec: 60,
  },
  intake: {
    componentType: 'heat_exchanger',
    heatExchangerMedium: 'water_to_oil',
    supplierCompanyName: 'Particle Science Technologies',
    supplierContactName: 'Guest Technical Evaluator',
    jobOrderNumber: 'WO-2026-DEMO',
    dateOfEntry: '30 / 09 / 2026',
    inspectorNameOrInitial: 'NM',
    damageCheckStatus: 'PASS',
    protectionCovers: 'metal',
    bungsCapsSupplied: true,
    oRingIdNo: 'OR-70-FKM-22',
    inhousePartNo: 'PS-HEX-400-DEMO',
    drawingNumber: 'DWG-DEMO-2026',
    flowVectorDirectionVerified: true,
    isFirstService: true,
    serviceType: 'routine_overhaul',
    lifeNumber: 1,
    incomingPressureTest: {
      performed: true,
      testPressureBar: 3.0,
      heldDurationSeconds: 60,
      startPressureBar: 3.0,
      endPressureBar: 3.0,
      result: 'PASS',
      notes: 'Initial receipt pressure verification passed with zero drop.',
    },
    completedAt: '2026-09-30T08:30:00.000Z',
    technician: 'Nicola Malgarotti',
    comments: 'Sample unit received for system demonstration and process map audit.',
    photos: [],
    videos: [],
    checklist: [],
  },
  degreasing: {
    skipped: false,
    tankId: 'TANK-ALPHA-01',
    chemicalType: 'SolvClean EcoHydro-600',
    bathTempC: 58.0,
    soakDurationMinutes: 20,
    soakDurationHours: 0.33,
    visualCleanlinessPass: true,
    technician: 'Nicola Malgarotti',
    notes: 'Degreased with hydrodynamic circulation.',
    completedAt: '2026-09-30T09:15:00.000Z',
    photos: [],
  },
  cleaning: {
    mode: 'with_analysis',
    detergentAgent: 'Apex V1 Precision Flow Agent',
    flowDynamicsCycleMinutes: 15,
    ultrasonicCycleMinutes: 15,
    bathTemperatureC: 45,
    technician: 'Nicola Malgarotti',
    notes: 'Rig flush completed. Zero metallic particulate detected.',
    completedAt: '2026-09-30T10:45:00.000Z',
    analysisResult: {
      uploadedAt: '2026-09-30T10:45:00.000Z',
      reportFiles: [],
      gravimetricSolidsMg: 0.8,
      particleCountIso: 'Apex 1.0 (Eq. ISO 16232): 12/9/7',
      moisturePpm: 25,
      verdict: 'CONFORMING',
      labTechnician: 'N. Malgarotti',
      analysisNotes: 'Sample cleanliness conforms to AS9100D cleanroom standard.',
    },
  },
  oven: {
    targetSeconds: 7200,
    remainingSeconds: 0,
    isRunning: false,
    timerCompleted: true,
    targetTempC: 110,
    actualTempC: 110.0,
    technician: 'Nicola Malgarotti',
    notes: 'Controlled chamber thermal dehydration executed per Particle Science Standard.',
    completedAt: '2026-09-30T13:00:00.000Z',
  },
  pressureTest: {
    gaugeId: 'DIGI-GAUGE-DEMO',
    testPressureBar: 3.0,
    startPressureBar: 3.0,
    endPressureBar: 3.0,
    heldDurationSeconds: 60,
    allowableDeltaBar: 0.2,
    testResult: 'PASS',
    leakDetected: false,
    technician: 'Nicola Malgarotti',
    notes: 'Proof pressure tested at 3.0 Bar for 60 seconds with 0.0 Bar drop.',
    completedAt: '2026-09-30T13:45:00.000Z',
  },
  flowTest: {
    benchId: 'FLOW-BENCH-DEMO',
    fluidType: 'Deionized Water (DI Water)',
    fluidTempC: 22.0,
    inletFlowLpm: 24.5,
    outletFlowLpm: 24.4,
    deltaPressureBar: 1.1,
    flowPass: true,
    pointsPassThreshold: 3,
    baselineSource: 'new_unit_birth_record',
    testPoints: [
      { pointIndex: 1, frequencyHz: 20, name: 'Point 1 (Idle / 20% Flow)', targetFlowLpm: 12.0, tolerancePercent: 15, toleranceBandLpm: 1.8, measuredFlowLpm: 12.1, deltaPressureBar: 0.35, passed: true, notes: 'Idle band calibrated' },
      { pointIndex: 2, frequencyHz: 30, name: 'Point 2 (Low / 40% Flow)', targetFlowLpm: 16.0, tolerancePercent: 15, toleranceBandLpm: 2.4, measuredFlowLpm: 15.9, deltaPressureBar: 0.65, passed: true, notes: 'Low band calibrated' },
      { pointIndex: 3, frequencyHz: 40, name: 'Point 3 (Cruise / 60% Flow)', targetFlowLpm: 20.0, tolerancePercent: 15, toleranceBandLpm: 3.0, measuredFlowLpm: 20.2, deltaPressureBar: 1.05, passed: true, notes: 'Nominal operating band' },
      { pointIndex: 4, frequencyHz: 50, name: 'Point 4 (High Demand / 80% Output)', targetFlowLpm: 24.5, tolerancePercent: 15, toleranceBandLpm: 3.68, measuredFlowLpm: 24.4, deltaPressureBar: 1.45, passed: true, notes: 'High operating band' },
      { pointIndex: 5, frequencyHz: 60, name: 'Point 5 (Full Capacity / 100% Max)', targetFlowLpm: 28.0, tolerancePercent: 15, toleranceBandLpm: 4.2, measuredFlowLpm: 27.9, deltaPressureBar: 1.9, passed: true, notes: 'Full pump delivery' },
    ],
    completedAt: '2026-09-30T14:30:00.000Z',
    technician: 'Nicola Malgarotti',
    notes: '5-point volumetric flow validation across 20-60 Hz drive range passed within +/-15%.',
  },
  finalFlush: {
    targetSeconds: 300,
    remainingSeconds: 0,
    isRunning: false,
    timerCompleted: true,
    technician: 'Nicola Malgarotti',
    notes: 'Completed 5m final flush cycle.',
  },
  gilling: {
    targetSeconds: 420,
    remainingSeconds: 0,
    elapsedSeconds: 420,
    isRunning: false,
    timerCompleted: true,
    technician: 'Nicola Malgarotti',
    notes: '100% hand bench dressed using precision combs. Zero mechanical comb jigs used.',
  },
  signOff: {
    pictures: [],
    inspectorName: 'Quality Lead Tech',
    inspectorId: 'QA-LEAD-01',
    qaDisposition: 'APPROVED',
    finalComments: 'Sample demonstration unit completed all 11 overhaul stations. Full conformance to AS9100D and ISO 9001 quality standards.',
    completedAt: '2026-09-30T15:45:00.000Z',
  },
  delivery: {
    targetDeliveryDate: '2026-09-30T18:00:00.000Z',
    dispatchStatus: 'ready_for_dispatch',
    priority: 'standard',
    carrier: 'Trackside Logistics Express',
    trackingNumber: 'TRK-2026-DEMO-01',
    destinationCity: 'Client Depot Hub',
    shippingNotes: 'Flight-case sealed and ready for client handover.',
  },
  activityLog: [],
};

export const GUEST_DEMO_FAIL_PRESSURE_UNIT: ServiceUnit = {
  id: 'unit-demo-fail-press-02',
  serialNumber: 'PSTS-DEMO-FAIL-PRESS-02',
  lifeNumber: 2,
  partNumber: 'HEX-W2O-400-FL',
  modelName: 'F1 High-Pressure Intercooler (Water to Oil)',
  customerName: 'Guest Evaluation Partner',
  customerEmail: 'demo.guest@particlescience.com',
  racingCategory: 'demonstration',
  racingType: 'Technical Evaluation Suite',
  chassisNumber: 'DEMO-CHASSIS-02',
  workOrderNumber: 'WO-2026-DEMO-FL',
  componentType: 'heat_exchanger',
  heatExchangerMedium: 'water_to_oil',
  supplierCompanyName: 'Particle Science Technologies',
  supplierContactName: 'Guest Technical Evaluator',
  supplierContactEmail: 'demo.guest@particlescience.com',
  assignedTechnician: 'Nicola Malgarotti',
  jobOrderNumber: 'WO-2026-DEMO-FL',
  inhousePartNo: 'PS-HEX-400-FL',
  drawingNumber: 'DWG-DEMO-2026',
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-02T14:15:00.000Z',
  currentStepId: 'pressure_test',
  overallStatus: 'quarantined',
  priority: 'emergency',
  processConfig: {
    degreasingRequired: true,
    cleaningMode: 'with_analysis',
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
    technician: 'Nicola Malgarotti',
    componentType: 'heat_exchanger',
    heatExchangerMedium: 'water_to_oil',
    supplierCompanyName: 'Particle Science Technologies',
    supplierContactName: 'Guest Technical Evaluator',
    jobOrderNumber: 'WO-2026-DEMO-FL',
    dateOfEntry: '01 / 10 / 2026',
    inspectorNameOrInitial: 'NM',
    damageCheckStatus: 'PASS',
    protectionCovers: 'metal',
    bungsCapsSupplied: true,
    oRingIdNo: 'OR-70-FKM-22',
    inhousePartNo: 'PS-HEX-400-FL',
    drawingNumber: 'DWG-DEMO-2026',
    flowVectorDirectionVerified: true,
    isFirstService: false,
    serviceType: 'routine_overhaul',
    lifeNumber: 2,
    comments: 'Sample unit received for pressure qualification audit.',
    photos: [],
    videos: [],
    checklist: [],
  },
  degreasing: {
    skipped: false,
    tankId: 'TANK-ALPHA-01',
    chemicalType: 'SolvClean EcoHydro-600',
    bathTempC: 58.0,
    soakDurationMinutes: 20,
    soakDurationHours: 0.33,
    visualCleanlinessPass: true,
    technician: 'Nicola Malgarotti',
    notes: 'Degreased with hydrodynamic circulation.',
    completedAt: '2026-10-01T10:15:00.000Z',
    photos: [],
  },
  flowTest: {
    benchId: 'FLOW-BENCH-DEMO',
    fluidType: 'Deionized Water (DI Water)',
    fluidTempC: 22.0,
    inletFlowLpm: 24.5,
    outletFlowLpm: 24.4,
    deltaPressureBar: 1.1,
    flowPass: true,
    pointsPassThreshold: 3,
    baselineSource: 'new_unit_birth_record',
    testPoints: [
      { pointIndex: 1, frequencyHz: 20, name: 'Point 1 (Idle / 20% Flow)', targetFlowLpm: 12.0, tolerancePercent: 15, toleranceBandLpm: 1.8, measuredFlowLpm: 12.1, deltaPressureBar: 0.35, passed: true, notes: 'Idle band calibrated' },
      { pointIndex: 2, frequencyHz: 30, name: 'Point 2 (Low / 40% Flow)', targetFlowLpm: 16.0, tolerancePercent: 15, toleranceBandLpm: 2.4, measuredFlowLpm: 15.9, deltaPressureBar: 0.65, passed: true, notes: 'Low band calibrated' },
      { pointIndex: 3, frequencyHz: 40, name: 'Point 3 (Cruise / 60% Flow)', targetFlowLpm: 20.0, tolerancePercent: 15, toleranceBandLpm: 3.0, measuredFlowLpm: 20.2, deltaPressureBar: 1.05, passed: true, notes: 'Nominal operating band' },
      { pointIndex: 4, frequencyHz: 50, name: 'Point 4 (High Demand / 80% Output)', targetFlowLpm: 24.5, tolerancePercent: 15, toleranceBandLpm: 3.68, measuredFlowLpm: 24.4, deltaPressureBar: 1.45, passed: true, notes: 'High operating band' },
      { pointIndex: 5, frequencyHz: 60, name: 'Point 5 (Full Capacity / 100% Max)', targetFlowLpm: 28.0, tolerancePercent: 15, toleranceBandLpm: 4.2, measuredFlowLpm: 27.9, deltaPressureBar: 1.9, passed: true, notes: 'Full pump delivery' },
    ],
    completedAt: '2026-10-01T11:30:00.000Z',
    technician: 'Nicola Malgarotti',
    notes: 'Flow test PASS.',
  },
  pressureTest: {
    gaugeId: 'DIGI-GAUGE-DEMO-02',
    testPressureBar: 5.0,
    startPressureBar: 5.0,
    endPressureBar: 4.42,
    heldDurationSeconds: 60,
    allowableDeltaBar: 0.2,
    testResult: 'FAIL',
    leakDetected: true,
    technician: 'Nicola Malgarotti',
    notes: 'FAIL: Hydrostatic pressure drop of 0.58 bar over 60s hold. Micro-porosity stream detected at weld seam B under 5 bar water submersion. Placed in IMMEDIATE QUARANTINE.',
    completedAt: '2026-10-02T14:15:00.000Z',
  },
  cleaning: {
    mode: 'with_analysis',
    detergentAgent: 'Apex V1 Precision Flow Agent',
    flowDynamicsCycleMinutes: 15,
    ultrasonicCycleMinutes: 15,
    bathTemperatureC: 45,
    technician: 'Nicola Malgarotti',
    notes: '',
  },
  finalFlush: {
    targetSeconds: 300,
    remainingSeconds: 300,
    isRunning: false,
    timerCompleted: false,
    technician: 'Nicola Malgarotti',
    notes: '',
  },
  oven: {
    targetSeconds: 7200,
    remainingSeconds: 7200,
    isRunning: false,
    timerCompleted: false,
    targetTempC: 110,
    actualTempC: 0,
    technician: 'Nicola Malgarotti',
    notes: '',
  },
  gilling: {
    targetSeconds: 420,
    remainingSeconds: 420,
    elapsedSeconds: 0,
    isRunning: false,
    timerCompleted: false,
    technician: 'Nicola Malgarotti',
    notes: '',
  },
  signOff: {
    pictures: [],
    inspectorName: 'Nicola Malgarotti (QA Lead)',
    inspectorId: 'TECH-402',
    qaDisposition: 'REJECTED',
    finalComments: 'HYDROSTATIC LEAK FAILURE: Failed 5.0 bar proof pressure hold (0.58 bar drop). Micro-porosity detected at weld seam B. Quarantined for TIG weld repair.',
    afterDryMoistureCheck: 'FAIL',
    afterDryVisualDamageCheck: 'FAIL',
    afterDryInspectorSign: 'N. Malgarotti',
    inertGasPurgeCompleted: false,
    sealingStatus: 'NEW_PARTICLE_SCIENCE_BUNGS_USED',
  },
  activityLog: [],
};

export const GUEST_DEMO_FAIL_CLEANLINESS_UNIT: ServiceUnit = {
  id: 'unit-demo-fail-clean-03',
  serialNumber: 'PSTS-DEMO-FAIL-CLEAN-03',
  lifeNumber: 1,
  partNumber: 'RAD-W2A-500-CL',
  modelName: 'F1 Lightweight Water Radiator Core',
  customerName: 'Guest Evaluation Partner',
  customerEmail: 'demo.guest@particlescience.com',
  racingCategory: 'demonstration',
  racingType: 'Technical Evaluation Suite',
  chassisNumber: 'DEMO-CHASSIS-03',
  workOrderNumber: 'WO-2026-DEMO-CL',
  componentType: 'water_radiator',
  supplierCompanyName: 'Particle Science Technologies',
  supplierContactName: 'Guest Technical Evaluator',
  supplierContactEmail: 'demo.guest@particlescience.com',
  assignedTechnician: 'L. Weber',
  jobOrderNumber: 'WO-2026-DEMO-CL',
  inhousePartNo: 'PS-RAD-500-CL',
  drawingNumber: 'DWG-DEMO-2026',
  createdAt: '2026-10-01T11:00:00.000Z',
  updatedAt: '2026-10-02T15:00:00.000Z',
  currentStepId: 'cleaning',
  overallStatus: 'quarantined',
  priority: 'high',
  processConfig: {
    degreasingRequired: true,
    cleaningMode: 'with_analysis',
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
    technician: 'Nicola Malgarotti',
    componentType: 'water_radiator',
    supplierCompanyName: 'Particle Science Technologies',
    supplierContactName: 'Guest Technical Evaluator',
    jobOrderNumber: 'WO-2026-DEMO-CL',
    dateOfEntry: '01 / 10 / 2026',
    inspectorNameOrInitial: 'NM',
    damageCheckStatus: 'PASS',
    protectionCovers: 'metal',
    bungsCapsSupplied: true,
    oRingIdNo: 'OR-70-FKM-22',
    inhousePartNo: 'PS-RAD-500-CL',
    drawingNumber: 'DWG-DEMO-2026',
    flowVectorDirectionVerified: true,
    isFirstService: true,
    serviceType: 'first_time_assembly',
    lifeNumber: 1,
    comments: 'Sample unit received for particle cleanliness analysis evaluation.',
    photos: [],
    videos: [],
    checklist: [],
  },
  degreasing: {
    skipped: false,
    tankId: 'TANK-ALPHA-01',
    chemicalType: 'SolvClean EcoHydro-600',
    bathTempC: 58.0,
    soakDurationMinutes: 20,
    soakDurationHours: 0.33,
    visualCleanlinessPass: true,
    technician: 'Nicola Malgarotti',
    notes: 'Degreased with hydrodynamic circulation.',
    completedAt: '2026-10-01T12:00:00.000Z',
    photos: [],
  },
  flowTest: {
    benchId: 'FLOW-BENCH-DEMO',
    fluidType: 'Deionized Water (DI Water)',
    fluidTempC: 22.0,
    inletFlowLpm: 28.0,
    outletFlowLpm: 27.8,
    deltaPressureBar: 0.85,
    flowPass: true,
    pointsPassThreshold: 3,
    baselineSource: 'new_unit_birth_record',
    testPoints: [
      { pointIndex: 1, frequencyHz: 20, name: 'Point 1 (Idle / 20% Flow)', targetFlowLpm: 12.0, tolerancePercent: 15, toleranceBandLpm: 1.8, measuredFlowLpm: 12.1, deltaPressureBar: 0.35, passed: true, notes: 'Idle band calibrated' },
      { pointIndex: 2, frequencyHz: 30, name: 'Point 2 (Low / 40% Flow)', targetFlowLpm: 16.0, tolerancePercent: 15, toleranceBandLpm: 2.4, measuredFlowLpm: 15.9, deltaPressureBar: 0.65, passed: true, notes: 'Low band calibrated' },
      { pointIndex: 3, frequencyHz: 40, name: 'Point 3 (Cruise / 60% Flow)', targetFlowLpm: 20.0, tolerancePercent: 15, toleranceBandLpm: 3.0, measuredFlowLpm: 20.2, deltaPressureBar: 1.05, passed: true, notes: 'Nominal operating band' },
      { pointIndex: 4, frequencyHz: 50, name: 'Point 4 (High Demand / 80% Output)', targetFlowLpm: 24.5, tolerancePercent: 15, toleranceBandLpm: 3.68, measuredFlowLpm: 24.4, deltaPressureBar: 1.45, passed: true, notes: 'High operating band' },
      { pointIndex: 5, frequencyHz: 60, name: 'Point 5 (Full Capacity / 100% Max)', targetFlowLpm: 28.0, tolerancePercent: 15, toleranceBandLpm: 4.2, measuredFlowLpm: 27.9, deltaPressureBar: 1.9, passed: true, notes: 'Full pump delivery' },
    ],
    completedAt: '2026-10-01T13:15:00.000Z',
    technician: 'Nicola Malgarotti',
    notes: 'Flow test PASS.',
  },
  pressureTest: {
    gaugeId: 'DIGI-GAUGE-DEMO',
    testPressureBar: 4.0,
    startPressureBar: 4.0,
    endPressureBar: 4.0,
    heldDurationSeconds: 60,
    allowableDeltaBar: 0.1,
    testResult: 'PASS',
    leakDetected: false,
    technician: 'Nicola Malgarotti',
    notes: 'Proof pressure tested 4.0 bar zero leak.',
    completedAt: '2026-10-01T14:00:00.000Z',
  },
  cleaning: {
    mode: 'with_analysis',
    detergentAgent: 'Apex V1 Precision Flow Agent',
    flowDynamicsCycleMinutes: 15,
    ultrasonicCycleMinutes: 15,
    bathTemperatureC: 45,
    technician: 'L. Weber',
    notes: 'Cleanliness analysis failed due to gravimetric particle overload.',
    analysisResult: {
      uploadedAt: '2026-10-02T14:45:00.000Z',
      reportFiles: [],
      gravimetricSolidsMg: 5.4,
      particleCountIso: 'Apex 1.0: 22/19/16 (FAILED)',
      moisturePpm: 120,
      verdict: 'REQUIRES_RECLEAN',
      labTechnician: 'L. Weber (Analytical QA)',
      analysisNotes: 'NON-CONFORMING: Gravimetric solids 5.4mg exceeds 3.0mg Apex 1.0 ceiling limit. Optical microscopy identified metallic machining swarf > 250μm inline. Core back-flush & ultrasonic re-cleaning mandated.',
    },
  },
  finalFlush: {
    targetSeconds: 300,
    remainingSeconds: 300,
    isRunning: false,
    timerCompleted: false,
    technician: 'L. Weber',
    notes: '',
  },
  oven: {
    targetSeconds: 7200,
    remainingSeconds: 7200,
    isRunning: false,
    timerCompleted: false,
    targetTempC: 110,
    actualTempC: 0,
    technician: 'L. Weber',
    notes: '',
  },
  gilling: {
    targetSeconds: 420,
    remainingSeconds: 420,
    elapsedSeconds: 0,
    isRunning: false,
    timerCompleted: false,
    technician: 'L. Weber',
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
  },
  activityLog: [],
};

export const GUEST_DEMO_INPROGRESS_UNIT: ServiceUnit = {
  id: 'unit-demo-inprog-04',
  serialNumber: 'PSTS-DEMO-INPROG-04',
  lifeNumber: 2,
  partNumber: 'CMB-2U-600',
  modelName: 'Dual Comby Matrix Core (Water Radiator + Engine Oil Cooler)',
  customerName: 'Guest Evaluation Partner',
  customerEmail: 'demo.guest@particlescience.com',
  racingCategory: 'demonstration',
  racingType: 'Technical Evaluation Suite',
  chassisNumber: 'DEMO-CHASSIS-04',
  workOrderNumber: 'WO-2026-DEMO-IP',
  componentType: 'combi_2_unit',
  supplierCompanyName: 'Particle Science Technologies',
  supplierContactName: 'Guest Technical Evaluator',
  supplierContactEmail: 'demo.guest@particlescience.com',
  assignedTechnician: 'Nicola Malgarotti',
  jobOrderNumber: 'WO-2026-DEMO-IP',
  inhousePartNo: 'PS-CMB-600',
  drawingNumber: 'DWG-DEMO-2026',
  createdAt: '2026-10-02T08:30:00.000Z',
  updatedAt: '2026-10-02T11:45:00.000Z',
  currentStepId: 'flow_test',
  overallStatus: 'in_progress',
  priority: 'high',
  processConfig: {
    degreasingRequired: true,
    cleaningMode: 'with_analysis',
    finalFlushDurationSeconds: 300,
    ovenDurationSeconds: 7200,
    ovenTargetTempC: 110,
    gillingDurationSeconds: 420,
    flowTargetMinLpm: 20.0,
    flowTargetMaxLpm: 26.0,
    pressureTargetBar: 16.0,
    pressureHoldTimeSec: 60,
  },
  intake: {
    technician: 'Nicola Malgarotti',
    componentType: 'combi_2_unit',
    supplierCompanyName: 'Particle Science Technologies',
    supplierContactName: 'Guest Technical Evaluator',
    jobOrderNumber: 'WO-2026-DEMO-IP',
    dateOfEntry: '02 / 10 / 2026',
    inspectorNameOrInitial: 'NM',
    damageCheckStatus: 'PASS',
    protectionCovers: 'metal',
    bungsCapsSupplied: true,
    oRingIdNo: 'OR-70-FKM-22',
    inhousePartNo: 'PS-CMB-600',
    drawingNumber: 'DWG-DEMO-2026',
    flowVectorDirectionVerified: true,
    isFirstService: false,
    serviceType: 'routine_overhaul',
    lifeNumber: 2,
    comments: 'Dual Comby unit received for flow test calibration.',
    photos: [],
    videos: [],
    checklist: [],
  },
  degreasing: {
    skipped: false,
    tankId: 'TANK-ALPHA-01',
    chemicalType: 'SolvClean EcoHydro-600',
    bathTempC: 58.0,
    soakDurationMinutes: 25,
    soakDurationHours: 0.42,
    visualCleanlinessPass: true,
    technician: 'Nicola Malgarotti',
    notes: 'Degreased with hydrodynamic circulation.',
    completedAt: '2026-10-02T10:00:00.000Z',
    photos: [],
  },
  flowTest: {
    benchId: 'FLOW-BENCH-DEMO',
    fluidType: 'Deionized Water (DI Water)',
    fluidTempC: 45.0,
    inletFlowLpm: 24.8,
    outletFlowLpm: 24.6,
    deltaPressureBar: 1.1,
    flowPass: true,
    pointsPassThreshold: 3,
    baselineSource: 'new_unit_birth_record',
    testPoints: [
      { pointIndex: 1, frequencyHz: 20, name: 'Point 1 (Idle / 20% Flow)', targetFlowLpm: 12.0, tolerancePercent: 15, toleranceBandLpm: 1.8, measuredFlowLpm: 12.1, deltaPressureBar: 0.35, passed: true, notes: 'Idle band calibrated' },
      { pointIndex: 2, frequencyHz: 30, name: 'Point 2 (Low / 40% Flow)', targetFlowLpm: 16.0, tolerancePercent: 15, toleranceBandLpm: 2.4, measuredFlowLpm: 15.9, deltaPressureBar: 0.65, passed: true, notes: 'Low band calibrated' },
      { pointIndex: 3, frequencyHz: 40, name: 'Point 3 (Cruise / 60% Flow)', targetFlowLpm: 20.0, tolerancePercent: 15, toleranceBandLpm: 3.0, measuredFlowLpm: 20.2, deltaPressureBar: 1.05, passed: true, notes: 'Nominal operating band' },
      { pointIndex: 4, frequencyHz: 50, name: 'Point 4 (High Demand / 80% Output)', targetFlowLpm: 24.5, tolerancePercent: 15, toleranceBandLpm: 3.68, measuredFlowLpm: 24.4, deltaPressureBar: 1.45, passed: true, notes: 'High operating band' },
      { pointIndex: 5, frequencyHz: 60, name: 'Point 5 (Full Capacity / 100% Max)', targetFlowLpm: 28.0, tolerancePercent: 15, toleranceBandLpm: 4.2, measuredFlowLpm: 27.9, deltaPressureBar: 1.9, passed: true, notes: 'Full pump delivery' },
    ],
    technician: 'Nicola Malgarotti',
    notes: 'Dual circuit testing in progress.',
  },
  pressureTest: {
    gaugeId: 'DIGI-GAUGE-DEMO',
    testPressureBar: 16.0,
    heldDurationSeconds: 60,
    startPressureBar: 0,
    endPressureBar: 0,
    allowableDeltaBar: 0.2,
    testResult: 'PENDING',
    leakDetected: false,
    technician: 'Nicola Malgarotti',
    notes: '',
  },
  cleaning: {
    mode: 'with_analysis',
    detergentAgent: 'Apex V1 Precision Flow Agent',
    flowDynamicsCycleMinutes: 15,
    ultrasonicCycleMinutes: 15,
    bathTemperatureC: 45,
    technician: 'Nicola Malgarotti',
    notes: '',
  },
  finalFlush: {
    targetSeconds: 300,
    remainingSeconds: 300,
    isRunning: false,
    timerCompleted: false,
    technician: 'Nicola Malgarotti',
    notes: '',
  },
  oven: {
    targetSeconds: 7200,
    remainingSeconds: 7200,
    isRunning: false,
    timerCompleted: false,
    targetTempC: 110,
    actualTempC: 0,
    technician: 'Nicola Malgarotti',
    notes: '',
  },
  gilling: {
    targetSeconds: 420,
    remainingSeconds: 420,
    elapsedSeconds: 0,
    isRunning: false,
    timerCompleted: false,
    technician: 'Nicola Malgarotti',
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
};

export const GUEST_DEMO_SAMPLE_UNITS: ServiceUnit[] = [
  GUEST_DEMO_SAMPLE_UNIT,
  GUEST_DEMO_FAIL_PRESSURE_UNIT,
  GUEST_DEMO_FAIL_CLEANLINESS_UNIT,
  GUEST_DEMO_INPROGRESS_UNIT,
];

/**
 * Intelligent matcher to verify if a unit belongs strictly to a customer team.
 * Compares customer email, team name, and corporate constructor brand tokens.
 */
export function isUnitAllocatedToTeam(
  unit: ServiceUnit,
  customerEmail?: string | null,
  customerName?: string | null
): boolean {
  if (!customerEmail && !customerName) return false;

  const inputEmail = (customerEmail || '').trim().toLowerCase();
  const inputTeamName = (customerName || '').trim().toLowerCase();
  const unitCustomer = (unit.customerName || '').trim().toLowerCase();
  const unitEmail = (unit.customerEmail || '').trim().toLowerCase();
  const unitSupplierEmail = (unit.supplierContactEmail || '').trim().toLowerCase();
  const unitIntakeSupplierEmail = (unit.intake?.supplierContactEmail || '').trim().toLowerCase();
  const unitSupplierCompany = (unit.supplierCompanyName || '').trim().toLowerCase();

  // Guest Demo Isolation:
  const isGuestUser = inputEmail === 'demo.guest@particlescience.com';
  const isGuestUnit = unitEmail === 'demo.guest@particlescience.com' || unit.serialNumber.includes('DEMO') || unit.id.includes('demo') || unit.serialNumber.startsWith('PSTS-DEMO');
  
  if (isGuestUser) {
    return isGuestUnit;
  }
  if (isGuestUnit) {
    // Non-guest users should never see the demo unit in their allocated fleet
    return false;
  }

  // 1. Direct Email equality check
  if (inputEmail) {
    if (unitEmail && unitEmail === inputEmail) return true;
    if (unitSupplierEmail && unitSupplierEmail === inputEmail) return true;
    if (unitIntakeSupplierEmail && unitIntakeSupplierEmail === inputEmail) return true;
  }

  // 2. Direct exact or substring customer name match
  if (inputTeamName && unitCustomer) {
    if (unitCustomer === inputTeamName) return true;
    if (unitCustomer.includes(inputTeamName) || inputTeamName.includes(unitCustomer)) return true;
  }

  // 3. Match against Team Brand Rules
  for (const rule of TEAM_BRAND_RULES) {
    const isUserThisBrand = 
      (inputEmail && rule.emails.some((e) => e.toLowerCase() === inputEmail)) ||
      (inputEmail && rule.domains.some((d) => inputEmail.endsWith(`@${d}`) || inputEmail.includes(d))) ||
      (inputTeamName && rule.primaryTokens.some((tok) => inputTeamName.includes(tok)));

    if (isUserThisBrand) {
      // Check disallow tokens for collision prevention (e.g. Porsche Penske 963 vs Team Penske IndyCar)
      if (rule.disallowTokens && rule.disallowTokens.some((dt) => unitCustomer.includes(dt))) {
        return false;
      }

      // Check if unit matches this constructor brand
      const unitMatchesBrand =
        rule.primaryTokens.some((tok) => unitCustomer.includes(tok) || unitSupplierCompany.includes(tok)) ||
        (unitEmail && rule.domains.some((d) => unitEmail.includes(d))) ||
        (unitSupplierEmail && rule.domains.some((d) => unitSupplierEmail.includes(d)));

      if (unitMatchesBrand) {
        return true;
      }
    }
  }

  // 4. Match against Custom Customers directory stored in localStorage
  const customCustomers = getCustomCustomers();
  const matchedCustom = customCustomers.find(
    (c) => (c.contactEmail && inputEmail && c.contactEmail.toLowerCase().trim() === inputEmail) ||
           (c.name && inputTeamName && c.name.toLowerCase().trim() === inputTeamName)
  );
  if (matchedCustom) {
    const customNameLower = matchedCustom.name.toLowerCase();
    if (unitCustomer === customNameLower || unitCustomer.includes(customNameLower)) {
      return true;
    }
  }

  return false;
}

/**
 * Intelligent matcher to verify if a unit belongs strictly to a customer email address
 */
export function isUnitAllocatedToCustomerEmail(
  unit: ServiceUnit,
  customerEmail: string | null | undefined
): boolean {
  if (!customerEmail || !customerEmail.trim()) return false;
  return isUnitAllocatedToTeam(unit, customerEmail, undefined);
}

/**
 * Filter units array to return ONLY units allocated to the given customer email and optional name
 */
export function getAllocatedUnitsForCustomer(
  units: ServiceUnit[],
  customerEmail: string | null | undefined,
  customerName?: string | null | undefined
): ServiceUnit[] {
  if (!customerEmail && !customerName) return [];
  const cleanEmail = (customerEmail || '').trim().toLowerCase();

  // Special handling for guest evaluation account
  if (cleanEmail === 'demo.guest@particlescience.com') {
    const found = units.filter((u) => u.customerEmail?.toLowerCase() === 'demo.guest@particlescience.com' || u.serialNumber.includes('DEMO'));
    const missing = GUEST_DEMO_SAMPLE_UNITS.filter(
      (demoUnit) => !found.some((u) => u.serialNumber === demoUnit.serialNumber || u.id === demoUnit.id)
    );
    return [...found, ...missing];
  }

  return units.filter((u) => isUnitAllocatedToTeam(u, customerEmail, customerName));
}

/**
 * Resolves customer company display name and metadata from an email
 */
export function getCustomerInfoByEmail(email: string | null | undefined): {
  customerName: string;
  category: string;
  tier: 'works' | 'customer';
  contactPerson?: string;
  phone?: string;
} {
  if (!email) {
    return {
      customerName: 'Client Constructor',
      category: 'Motorsport',
      tier: 'customer',
    };
  }

  const clean = email.toLowerCase().trim();

  // Check predefined directory
  const preset = DEFAULT_CUSTOMER_ACCOUNTS.find((a) => a.email.toLowerCase() === clean);
  if (preset) {
    return {
      customerName: preset.customerName,
      category: preset.category,
      tier: preset.tier,
      contactPerson: preset.contactPerson,
      phone: preset.phone,
    };
  }

  // Check custom customers
  const customList = getCustomCustomers();
  const custom = customList.find(
    (c) => c.contactEmail && c.contactEmail.toLowerCase().trim() === clean
  );
  if (custom) {
    return {
      customerName: custom.name,
      category: custom.categoryId || 'Motorsport',
      tier: custom.tier || 'customer',
      contactPerson: custom.contactName,
      phone: custom.contactPhone,
    };
  }

  // Fallback domain extraction
  const domain = email.includes('@') ? email.split('@')[1] : email;
  const company = domain.split('.')[0] || 'Client Organization';
  const capitalized = company.charAt(0).toUpperCase() + company.slice(1);

  return {
    customerName: capitalized,
    category: 'Client Overhaul Services',
    tier: 'customer',
    contactPerson: email.split('@')[0],
  };
}

/**
 * Check if current user is an assigned service technician / depot staff member
 * Only assigned persons can access Service Analytics and Daily Quota.
 */
export function isAssignedPerson(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.role === ('customer' as any)) return false;
  return ['lead_engineer', 'technician', 'qa_inspector', 'admin'].includes(profile.role);
}

/**
 * Helper to check access for service analytics & daily quota
 */
export function canAccessServiceAnalytics(profile: UserProfile | null | undefined): boolean {
  return isAssignedPerson(profile);
}

export function canAccessDailyQuota(profile: UserProfile | null | undefined): boolean {
  return isAssignedPerson(profile);
}
