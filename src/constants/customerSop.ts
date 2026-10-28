import { StepId } from '../types/process';

export interface StageSopDetail {
  stageNumber: string;
  id: StepId;
  title: string;
  sopCode: string;
  shortSummary: string;
  objective: string;
  simplifiedProcedure: string[];
  qualityControls: string[];
  customerAssurance: string;
  badgeColor: string;
  iconName: string;
}

export const CUSTOMER_SIMPLIFIED_SOPS: StageSopDetail[] = [
  {
    stageNumber: '01',
    id: 'intake',
    title: 'Intake Assessment & Inspection',
    sopCode: 'SOP-S01-INT',
    shortSummary: 'Initial receipt registration, serial tracking, damage check, and medium verification.',
    objective: 'Log incoming unit into the Particle Science database, verify serialized provenance, and assess core structural condition before processing.',
    simplifiedProcedure: [
      'Unbox unit in clean receiving bay and inspect protective transit bungs and seals.',
      'Verify unit serial number, work order allocation, and constructor part identification.',
      'Perform 360-degree visual surface inspection for impact damage, core deformation, or port thread wear.',
      'Confirm heat exchanger exchange medium (Water to Oil, Oil to Oil, or Water to Air) and record in life history.',
      'Execute optional pre-overhaul hydrostatic check to log baseline integrity.'
    ],
    qualityControls: [
      'Serial & Work Order barcode matching',
      'Physical port thread & O-ring seat inspection',
      'Component type & medium verification'
    ],
    customerAssurance: 'Establishes chain of custody and ensures pre-existing physical damage is flagged prior to chemical and dynamic testing.',
    badgeColor: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
    iconName: 'ClipboardCheck'
  },
  {
    stageNumber: '02',
    id: 'degreasing',
    title: 'Core Degreasing & Oil Evacuation',
    sopCode: 'SOP-S02-DEG',
    shortSummary: 'Hot solvent circulation and hydrodynamic bath soak to remove internal oil deposits.',
    objective: 'Dissolve and extract residual lubrication oils, burnt hydrocarbons, and heavy sludge from internal matrix channels.',
    simplifiedProcedure: [
      'Connect unit to temperature-controlled solvent recirculation tank.',
      'Submerge core in eco-certified degreasing bath at controlled temperature (~58°C).',
      'Circulate high-efficiency degreasing agent through internal passages with multi-directional flow pulses.',
      'Perform vacuum scavenge oil drain to ensure zero stagnant oil pockets remain in matrix corners.',
      'Drain chemical solution and prepare unit for descaling phase.'
    ],
    qualityControls: [
      'Bath temperature and chemical concentration monitor',
      'Controlled circulation timer (15-30 min soak)',
      'Visual outlet effluent check'
    ],
    customerAssurance: 'Restores internal core surface wetting capability and prepares channels for precision descaling and particle extraction.',
    badgeColor: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
    iconName: 'Droplets'
  },
  {
    stageNumber: '03',
    id: 'descaling',
    title: 'Passage Descaling & Mineral Removal',
    sopCode: 'SOP-S03-DSC',
    shortSummary: 'Targeted descaling flush to clear internal mineral crusting and oxides.',
    objective: 'Eliminate scale build-up, oxidation, and mineral deposits that insulate cooling surfaces and restrict fluid channels.',
    simplifiedProcedure: [
      'Circulate specialized non-corrosive descaling agent through internal water channels.',
      'Monitor fluid pressure differential across inlet and outlet ports to ensure uniform passage cleaning.',
      'Reverse flow direction midway through cycle to dislodge stubborn mineral scale on tube walls.',
      'Flush core thoroughly to neutralize descaling agents and verify pH balance.',
      'Inspect manifold ports for cleared flow pathways.'
    ],
    qualityControls: [
      'Neutral pH balance verification post-rinse',
      'Regulated pump pressure ceiling limits',
      'Dual-direction reverse flow cycle execution'
    ],
    customerAssurance: 'Restores maximum thermal conductivity across internal aluminum tube surfaces for peak cooling efficiency.',
    badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    iconName: 'Sparkles'
  },
  {
    stageNumber: '04',
    id: 'first_flush',
    title: 'Deionized Water First Flush',
    sopCode: 'SOP-S04-FL1',
    shortSummary: 'High-purity deionized water flush to evacuate chemical residues and large particulates.',
    objective: 'Rinse all chemical cleaning agents out of the core using high-resistivity deionized water.',
    simplifiedProcedure: [
      'Couple unit to deionized water supply line at 55°C controlled temperature.',
      'Flush core continuously through all ports for 5 to 10 minutes depending on matrix volume.',
      'Perform targeted port-by-port flush for multi-circuit combi units.',
      'Measure fluid conductivity at outlet port until baseline DI water purity is reached.',
      'Purge excess water with ultra-clean dry compressed air.'
    ],
    qualityControls: [
      'Deionized water resistivity & temperature check',
      'All ports individually flushed and logged',
      'Effluent visual clarity test'
    ],
    customerAssurance: 'Guarantees zero chemical contamination remains inside the cooler prior to dynamic flow testing.',
    badgeColor: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    iconName: 'Waves'
  },
  {
    stageNumber: '05',
    id: 'flow_test',
    title: 'Flow Dynamics & Calibration Testing',
    sopCode: 'SOP-S05-FLD',
    shortSummary: 'Multi-point dynamic flow profiling across operating frequency bands (20Hz - 60Hz).',
    objective: 'Measure fluid flow rate (LPM) and pressure drop (Bar) across 5 calibrated operating points to verify matrix hydraulic balance.',
    simplifiedProcedure: [
      'Mount unit on Particle Science dynamic flow test rig with calibrated magnetic flow meters.',
      'Run 5-point variable pump frequency curve from idle (20 Hz) to maximum delivery (60 Hz).',
      'Log volumetric flow rate (LPM) and differential pressure drop (ΔP Bar) at each point.',
      'Compare measured flow curves against baseline birth records or OEM tolerance bands (typically ±15%).',
      'Generate dynamic flow chart and evaluate multi-circuit flow balance.'
    ],
    qualityControls: [
      'Minimum 3 of 5 test points must meet tolerance threshold',
      'Calibrated digital pressure transducers and flow sensors',
      'Automated pass/fail flow matrix validation'
    ],
    customerAssurance: 'Verifies that fluid flow meets exact engine/chassis hydraulic demands without unwanted pressure restrictions.',
    badgeColor: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    iconName: 'Gauge'
  },
  {
    stageNumber: '06',
    id: 'pressure_test',
    title: 'Proof Hydrostatic Pressure Testing',
    sopCode: 'SOP-S06-PRS',
    shortSummary: 'High-pressure static hold test to verify core structural integrity and zero micro-leaks.',
    objective: 'Subject internal passages to proof pressure (3 Bar to 210 Bar depending on spec) to guarantee zero leakage under extreme racing loads.',
    simplifiedProcedure: [
      'Cap output ports with high-pressure rated test fittings and fill unit with fluid.',
      'Pressurize internal circuit using precision digital gauge up to target proof pressure rating.',
      'Hold pressure for mandatory 60-second stabilization timer.',
      'Monitor digital gauge for any pressure drop exceeding allowable tolerance (e.g. 0.1-0.2 Bar max).',
      'Perform water submersion bubble check or helium sniffer verification if drop is detected.'
    ],
    qualityControls: [
      'Zero allowable leak drop over 60s hold',
      'Digitally calibrated test gauge tracking',
      'Automatic quarantine disposition if pressure threshold fails'
    ],
    customerAssurance: 'Provides 100% confidence that the heat exchanger will withstand trackside hydraulic surges without internal or external leaks.',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    iconName: 'ShieldCheck'
  },
  {
    stageNumber: '07',
    id: 'cleaning',
    title: 'Ultra Fine RIG Particle Cleaning & Analysis',
    sopCode: 'SOP-S07-CLN',
    shortSummary: 'Micro-filtration dynamic flushing and optical particulate cleanliness analysis.',
    objective: 'Extract microscopic metallic particulate and verify core cleanliness against strict ISO 16232 / AS9100D cleanroom standards.',
    simplifiedProcedure: [
      'Connect cooler to high-flow dynamic cleaning rig equipped with sub-micron filtration.',
      'Circulate precision cleaning fluid under ultrasonic and hydrodynamic pulsing action.',
      'Pass effluent through 47mm analytical membrane filter patch in cleanroom lab environment.',
      'Perform gravimetric solids weighing (mg) and optical particle counting (ISO 4406 / Apex rating).',
      'Issue analytical cleanliness lab certificate and attach to unit digital passport.'
    ],
    qualityControls: [
      'Gravimetric particulate mass ceiling check (e.g. < 3.0 mg)',
      'Sub-micron filter membrane optical inspection',
      'Cleanliness verdict: CONFORMING or REQUIRES_RECLEAN'
    ],
    customerAssurance: 'Prevents catastrophic power unit / transmission failure caused by foreign particle debris originating from the cooling system.',
    badgeColor: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
    iconName: 'Microscope'
  },
  {
    stageNumber: '08',
    id: 'final_flush',
    title: 'Precision Deionized Final Flush',
    sopCode: 'SOP-S08-FL2',
    shortSummary: 'Final ultra-clean deionized rinse to remove any trace analysis fluid.',
    objective: 'Execute final cleansing cycle with ultra-pure water before thermal drying.',
    simplifiedProcedure: [
      'Connect unit to dedicated cleanroom final flush rig.',
      'Flush internal passages with 55°C deionized water for 300 seconds (5 minutes).',
      'Purge residual liquid using dry medical-grade nitrogen or filtered compressed air.',
      'Verify port cleanliness and ensure zero particulate residue on coupling threads.',
      'Transfer unit directly to thermal bakeout oven.'
    ],
    qualityControls: [
      '5-minute automated timer countdown',
      'Filtered air purge verification',
      'Cleanroom transfer protocol'
    ],
    customerAssurance: 'Ensures the interior is immaculate and ready for thermal dehydration without leaving chemical film residues.',
    badgeColor: 'border-teal-500/40 bg-teal-500/10 text-teal-300',
    iconName: 'Droplet'
  },
  {
    stageNumber: '09',
    id: 'oven',
    title: 'Thermal Oven Bakeout & Dehydration',
    sopCode: 'SOP-S09-THM',
    shortSummary: 'Controlled chamber thermal bakeout to completely evacuate trapped moisture.',
    objective: 'Bake unit in temperature-controlled oven (110°C) to eliminate internal moisture pockets and prevent internal corrosion.',
    simplifiedProcedure: [
      'Load unit into industrial thermal drying oven chamber.',
      'Set bakeout cycle for 2 hours (7,200 seconds) at 110°C controlled temperature.',
      'Circulate hot dry air through internal core passages.',
      'Monitor chamber thermocouple temperature sensors throughout bake cycle.',
      'Cool unit down under humidity-controlled cleanroom conditions.'
    ],
    qualityControls: [
      'Digital thermocouple log (110°C target)',
      'Automated 2-hour soak timer',
      'Post-bake moisture check pass'
    ],
    customerAssurance: 'Eliminates trapped water that could cause fluid contamination, corrosion, or steam pockets under high-temperature race conditions.',
    badgeColor: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    iconName: 'Flame'
  },
  {
    stageNumber: '10',
    id: 'gilling',
    title: 'Precision Manual Fin Straightening',
    sopCode: 'SOP-S10-FIN',
    shortSummary: '100% hand dressing of cooling fins using precision tools for maximum airflow.',
    objective: 'Straighten bent or damaged matrix cooling fins by hand to maximize frontal airflow area and heat transfer.',
    simplifiedProcedure: [
      'Place unit under high-intensity inspection lighting on soft leather workshop pads.',
      'Systematically inspect cooling matrix face for bent, flattened, or misaligned fins.',
      'Hand-dress fins using specialized precision fin combs and non-marring tools.',
      'Straighten louvred air passages to restore nominal aerodynamic open-area ratio.',
      'Perform final visual optical scan across front and rear core faces.'
    ],
    qualityControls: [
      '100% hand bench dressed (zero aggressive comb jigs used)',
      'Visual airflow passage open-area inspection',
      'Core face surface protection check'
    ],
    customerAssurance: 'Restores maximum ambient airflow through the radiator/cooler core face for optimal aerodynamic cooling efficiency on track.',
    badgeColor: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
    iconName: 'Sliders'
  },
  {
    stageNumber: '11',
    id: 'sign_off',
    title: 'Final QA Conformance & Protective Sealing',
    sopCode: 'SOP-S11-SGN',
    shortSummary: 'ISO 17025 final quality sign-off, protective bunging, and dispatch authorization.',
    objective: 'Conduct final quality audit, seal internal passages with protective bungs, and issue official Master Service Certificate.',
    simplifiedProcedure: [
      'Senior QA Inspector verifies that all preceding 10 stage quality sign-offs are complete and passed.',
      'Verify inert gas purge completion and seal ports with new Particle Science protective bungs/caps.',
      'Affix tamper-evident QA inspection badge and serial barcode label.',
      'Sign digital ISO 17025 Conformance Certificate and compile Master Service Report PDF.',
      'Transfer unit to flight case / protective dispatch packaging for client delivery.'
    ],
    qualityControls: [
      'QA Lead digital signature and authorization',
      'New Particle Science protective bungs installed',
      'Certificate of Conformance QR passport issued'
    ],
    customerAssurance: 'Provides complete traceable documentation, verifying that your cooler meets all quality, safety, and performance standards.',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    iconName: 'Award'
  }
];
