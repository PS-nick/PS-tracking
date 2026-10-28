import React, { useState } from 'react';
import { 
  BookOpen, 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  HardHat,
  Eye,
  Flame,
  Check,
  Printer
} from 'lucide-react';
import { StepId } from '../types/process';

export interface StepSopDefinition {
  sopCode: string; // e.g. "SOP-DEP-03"
  revision: string; // e.g. "Rev 2.4 (2026)"
  title: string;
  stageName: string;
  scope: string;
  safetyPpe: string[];
  equipmentRequired: string[];
  criticalParameters: { label: string; value: string; tolerance: string }[];
  steps: { stepNumber: number; title: string; detail: string; caution?: string }[];
  acceptanceCriteria: string;
  isoReference: string;
}

export const STEP_SOPS: Record<StepId, StepSopDefinition> = {
  intake: {
    sopCode: 'SOP-DEP-01',
    revision: 'Rev 2.4 (2026)',
    title: 'Component Receipt, Asset Tagging & Initial Damage Survey',
    stageName: 'Stage 01: Intake & In-Sheet Assessment',
    scope: 'Verification of arrival physical condition, QR barcode generation, customer serial registration, and determination of service life cycle.',
    safetyPpe: ['Chemical Resistant Nitrile Gloves (EN 374)', 'Safety Eyewear (ANSI Z87.1)', 'Steel Toe Safety Footwear'],
    equipmentRequired: ['High-Res 2D Barcode Tag Printer', 'Digital Vernier Caliper (Calibrated)', 'Optical Inspection Lamp'],
    criticalParameters: [
      { label: 'Work Order Match', value: '100% Paperwork Verification', tolerance: 'Mandatory' },
      { label: 'Port Bung Integrity', value: 'Plugs Installed & Sealed', tolerance: 'Zero Ingress' },
      { label: 'Core Array Deflection', value: '< 1.5mm Total Bowing', tolerance: 'Max allowable' }
    ],
    steps: [
      { stepNumber: 1, title: 'Unbox & Quarantine Check', detail: 'Inspect shipping flight case or container. Verify unbroken security seal and record supplier tracking tag.' },
      { stepNumber: 2, title: 'Initial Visual Damage Survey', detail: 'Inspect outer casing, inlet/outlet necks, and array fins under optical lamp for impact cracks or shipping gouges. If damage is found, document immediately and mark DAMAGE_FOUND.', caution: 'Structural cracks require supervisor sign-off before proceeding.' },
      { stepNumber: 3, title: 'Auto-Generate QR Asset Tag', detail: 'Generate high-contrast tracking QR code encoding serial number, life cycle, and work order. Print and securely adhere to side bracket.' },
      { stepNumber: 4, title: 'Bicester In-Sheet Log Entry', detail: 'Record customer name, component classification (single vs Combi 2/3 unit), and inspector initials into document PS-WORKBENCH-QA-2026.' }
    ],
    acceptanceCriteria: 'Unit verified against work order, QR tag securely adhered, damage status formally categorized, and In-Sheet signed.',
    isoReference: 'ISO 9001:2015 Clause 8.5.2 & Bicester QA-2026'
  },
  degreasing: {
    sopCode: 'SOP-DEP-02',
    revision: 'Rev 2.5 (2026)',
    title: 'Oil Draining & Room-Temperature Degreaser Flow-Through Protocol (No Immersion)',
    stageName: 'Stage 02: Oil Drain & Room-Temp Degreaser Flow-Through',
    scope: 'Mandatory pre-evacuation of residual motor oil, followed by room-temperature flow-through chemical circulation through core passages. Submersion / immersion tank bath is strictly prohibited.',
    safetyPpe: ['Heavy Duty Nitrile Gloves', 'Safety Splash Goggles', 'Vapour Extraction Hood'],
    equipmentRequired: ['Oil Scavenge Station DRAIN-BAY-01', 'Flow-Through Degreaser Circulation Rig (Room Temp)', 'Fluid Catch Basin'],
    criticalParameters: [
      { label: 'Oil Draining Dwell', value: '0.25 hrs (15 Minutes)', tolerance: '±0.02 hrs' },
      { label: 'Degreaser Fluid Temp', value: '20°C – 22°C (Room Temp Ambient)', tolerance: '±2°C' },
      { label: 'Immersion Status', value: 'NO IMMERSION (Flow-Through Only)', tolerance: 'Zero bath dip' },
      { label: 'Flow Circulation Time', value: '0.25 – 0.33 hrs (15 – 20 Min)', tolerance: 'Min 0.25 hrs' },
      { label: 'Circulation Flow Rate', value: '12 – 16 LPM Ambient Flow', tolerance: 'Nominal' }
    ],
    steps: [
      { stepNumber: 1, title: 'Compulsory Oil Draining Before Degreasing', detail: 'Mount unit on drain rig. Apply pneumatic vacuum scavenge for 0.25 hrs (15 min). Inspect evacuated fluid condition and check for metallic shavings (no volume measurement required).' },
      { stepNumber: 2, title: 'Connect Room-Temp Flow-Through Couplers', detail: 'Connect quick-disconnect fluid lines from the room-temperature chemical solvent rig directly to inlet and outlet manifold ports. Verify secure fluid loop.' },
      { stepNumber: 3, title: 'Circulate Room-Temp Chemical Solvent (No Immersion)', detail: 'Circulate chemical solvent at ambient room temperature (20-22°C) through internal passages for 15-20 min. Note: We use chemical solvent; do not immerse the radiator into hot or caustic tanks.' },
      { stepNumber: 4, title: 'Drain Chemical Solvent & Inspect', detail: 'Evacuate chemical solvent back to recovery reservoir. Inspect core exterior to ensure zero fin damage, then proceed directly to Stage 03 First Flush.' }
    ],
    acceptanceCriteria: 'Complete oil evacuation, internal passages thoroughly stripped with room-temperature flow degreaser, zero tank immersion.',
    isoReference: 'ISO 14001 Environmental Standard & Apex V1 Motorsport Spec'
  },
  descaling: {
    sopCode: 'SOP-DEP-02C',
    revision: 'Rev 1.0 (2026)',
    title: 'Descaled Internal Passages Cycle (Chemical Descaling Protocol)',
    stageName: 'Stage 03: Descaled Internal Passages Cycle',
    scope: 'Internal fluid core descaling flush to eliminate calcification, mineral deposits, and scaling from tube walls between degreaser and first flush.',
    safetyPpe: ['Chemical Acid-Resistant Nitrile Gloves', 'Full Face Shield', 'Acid Apron'],
    equipmentRequired: ['Descaling Fluid Circulation Loop', 'pH Neutralization Tank', 'Acid-Proof Diaphragm Pump'],
    criticalParameters: [
      { label: 'Circulation Duration', value: '15 Minutes (0.25 hrs)', tolerance: '±2 mins' },
      { label: 'Descaling Agent', value: 'Inhibited Organic Acid Formulation', tolerance: 'Nominal' },
      { label: 'Effluent pH Neutrality', value: 'pH 6.5 – 7.5 post-rinse', tolerance: 'Mandatory' }
    ],
    steps: [
      { stepNumber: 1, title: 'Mount Descaling Quick-Disconnect Couplers', detail: 'Mount acid-resistant couplers to core inlet and outlet manifolds.' },
      { stepNumber: 2, title: 'Execute Internal Descaling Wash', detail: 'Circulate chemical descaling formulation through internal matrix passages for 15 minutes.' },
      { stepNumber: 3, title: 'Neutralize & Flush Acid Traces', detail: 'Evacuate descaling agent to recovery tank and rinse with clean water until neutral pH is confirmed.' },
      { stepNumber: 4, title: 'Sign-Off Stage 03', detail: 'Confirm core is descaled, passages free of mineral calcification, and proceed to First Flush.' }
    ],
    acceptanceCriteria: 'Internal tubes cleared of scale deposits, passages neutral pH, zero chemical residue remaining.',
    isoReference: 'ISO 9001:2015 Clause 8.5.1 & Bicester Descaling QA Spec'
  },
  first_flush: {
    sopCode: 'SOP-DEP-02B',
    revision: 'Rev 1.0 (2026)',
    title: 'First Flush: 55°C Deionized Water Soaping Agent Removal Protocol',
    stageName: 'Stage 04: First Flush (55°C Deionized Water)',
    scope: 'Single dedicated deionized water flush at 55°C to dissolve, neutralize, and evacuate foaming surfactant soaping agents left by the degreaser before baseline flow testing. No secondary flush required.',
    safetyPpe: ['Thermal Nitrile Heat-Resistant Gloves', 'Safety Splash Glasses', 'Slip-Resistant Footwear'],
    equipmentRequired: ['Thermostatic 55°C DI Flush Station', 'In-Line Resistivity Sensor', 'High-Clarity Sight Glass Assembly'],
    criticalParameters: [
      { label: 'DI Water Temperature', value: '55.0°C Thermostatic Supply', tolerance: '±2°C' },
      { label: 'Flush Duration', value: '5 – 6 Minutes (0.083 – 0.100 hrs)', tolerance: 'Min 5 mins' },
      { label: 'Water Resistivity', value: '≥ 15 MΩ·cm High-Purity DI', tolerance: 'Strict' },
      { label: 'Effluent Foaming', value: 'Zero Soap Bubbles (100% Foam Free)', tolerance: 'Mandatory' }
    ],
    steps: [
      { stepNumber: 1, title: 'Connect 55°C Deionized Supply Line', detail: 'Coupled heated DI water line (55°C) to core inlet port. Direct drain hose through illuminated visual sight glass to drain manifold.' },
      { stepNumber: 2, title: 'Initiate 55°C Flush Timer', detail: 'Start timed flow of 55°C DI water for 5 to 6 minutes (0.083 to 0.100 hrs). 55°C temperature dissolves surfactant soap film inside micro-tubes.' },
      { stepNumber: 3, title: 'Monitor Sight Glass for Foam Evacuation', detail: 'Observe initial milky/foamy effluent as soaping agent is discharged. Continue flushing until effluent runs 100% crystal-clear.' },
      { stepNumber: 4, title: 'Verify Resistivity & Clear Effluent', detail: 'Confirm DI water resistivity reaches ≥ 15 MΩ·cm and zero residual lather is present. Unit is now ready for Stage 05 Flow Bench Testing.' }
    ],
    acceptanceCriteria: '55°C DI water flush completed, effluent 100% free of soaping bubbles/foam, resistivity verified ≥ 15 MΩ·cm.',
    isoReference: 'Nicola Malgarotti Workshop Standard & ISO 9001:2015 QA-2026'
  },
  flow_test: {
    sopCode: 'SOP-DEP-03',
    revision: 'Rev 3.0 (2026)',
    title: '5-Point Operating Flow Dynamics Calibration Protocol',
    stageName: 'Stage 05: Flow Testing (Flow Dynamics)',
    scope: 'Multi-point volumetric fluid flow rate benchmarking across 5 motor drive frequencies (20 Hz, 30 Hz, 40 Hz, 50 Hz, 60 Hz). Evaluation against New Unit Birth standard within ±15% bracket.',
    safetyPpe: ['Fluid Resistant Safety Glasses', 'Nitrile Gloves', 'Oil-Resistant Grip Boots'],
    equipmentRequired: ['Calibrated Flow Bench RIG-02/04', 'Coriolis Mass Flow Meter', 'Digital Pressure Transducer ΔP'],
    criticalParameters: [
      { label: 'Drive Frequencies', value: '20, 30, 40, 50, 60 Hz', tolerance: '±0.1 Hz' },
      { label: 'Tolerance Bracket', value: '±15% of Target LPM', tolerance: 'Strict bracket' },
      { label: 'Stage Passing Rule', value: '≥3 of 5 Points In-Spec', tolerance: 'Mandatory standard' }
    ],
    steps: [
      { stepNumber: 1, title: 'Verify Technical Blueprint Drawing', detail: 'Cross-reference component drawing (DWG-2026-F1-08) to verify fluid inlet/outlet vector direction and ensure correct coupling adapters are mounted.' },
      { stepNumber: 2, title: 'Purge Air from Hydraulic Circuit', detail: 'Circulate calibration fluid (ISO VG 32 or Coolant 50/50) at 20 Hz until sight glass shows zero air pockets or cavitation bubbles.' },
      { stepNumber: 3, title: 'Log 5 Discrete Operating Points', detail: 'Step drive frequency through 20 Hz (Idle), 30 Hz (Cruise), 40 Hz (Mid-Power), 50 Hz (High Duty), and 60 Hz (Max Flow). Record measured LPM, outlet LPM, and differential pressure ΔP.' },
      { stepNumber: 4, title: 'Compare Against Previous Service Run', detail: 'Evaluate current flow curve against previous service test points from same unit. Verify flow restoration after cleaning.' },
      { stepNumber: 5, title: 'Comby Multi-Circuit Validation', detail: 'If testing a Comby Unit, repeat the full 5-point calibration protocol for each independent circuit (Core 1, Core 2, Core 3).' }
    ],
    acceptanceCriteria: 'At least 3 of 5 test points must fall strictly within the ±15% tolerance bracket of target flow rate. All Comby circuits verified.',
    isoReference: 'AS9100D Technical Standard & ISO 9001:2015 Calibration Clause 7.1.5'
  },
  pressure_test: {
    sopCode: 'SOP-DEP-04',
    revision: 'Rev 2.8 (2026)',
    title: 'Hydrostatic Proof Containment & Structural Glue Repair Protocol',
    stageName: 'Stage 06: Pressure Testing & Integrity',
    scope: 'Sub-surface water immersion proof pressure containment verification. Detection of micro-porosities, seam leaks, and application of certified aerospace structural epoxy glue repair.',
    safetyPpe: ['Full Face Shield', 'High-Pressure Blast Containment Screen', 'Heavy Nitrile Sleeves'],
    equipmentRequired: ['Immersion Hydro-Tank (Water Bath)', 'Calibrated Digital Test Gauge (0-250 Bar)', 'Dry Nitrogen / Helium Gas Line'],
    criticalParameters: [
      { label: 'Immersion Hold Time', value: '60 Seconds Continuous Dwell', tolerance: 'Min 60 sec' },
      { label: 'Pressure Decay (ΔP)', value: '< 0.10 Bar (Zero Drop)', tolerance: 'Max 0.10 Bar' },
      { label: 'Bubble Stream Allowance', value: 'Zero Bubble Stream', tolerance: '0 Tolerance' }
    ],
    steps: [
      { stepNumber: 1, title: 'Sub-Surface Immersion Setup', detail: 'Securely cap all ports with calibrated test bungs. Submerge component in illuminated water bath.' },
      { stepNumber: 2, title: 'Controlled Pressure Ramp', detail: 'Pressurize internally with gas (Helium / Air) up to target proof pressure (e.g. 4.0 Bar Water, 16.0 Bar Oil). Maintain dwell for 60 seconds.' },
      { stepNumber: 3, title: 'Visual Inspection for Bubble Streams', detail: 'Observe all tube-to-header seams, side plate welds, and port fittings for bubble release streams. Record P1 and P2 pressure levels.' },
      { stepNumber: 4, title: 'Aerospace Structural Glue Repair (If Leak Detected)', detail: 'If micro-leakage is observed, abort pressure test. Degrease and abrade defect with 120-grit emery, apply Loctite EA 9497 high-temp thermal epoxy paste, and execute heat cure (60°C / 60 mins). Conduct mandatory hydrostatic re-test.' },
      { stepNumber: 5, title: 'Multi-Core Comby Certification', detail: 'For Comby units, test each independent circuit to its designated proof pressure rating.' }
    ],
    acceptanceCriteria: 'Zero bubble streams observed throughout 60s dwell time; pressure decay within allowable delta. All glue repairs recertified.',
    isoReference: 'AS9100D Aerospace Standard & ASME Section VIII Division 1'
  },
  cleaning: {
    sopCode: 'SOP-DEP-05',
    revision: 'Rev 4.0 (2026)',
    title: 'Ultra Fine RIG Cleaning & Micro-Particle Optical Analysis Protocol',
    stageName: 'Stage 07: Ultra Fine RIG Cleaning',
    scope: 'High-turbulence precision circulation loop on the dedicated Ultra Fine RIG. Component cleaning specification selectable from 5, 10, 25, 50, 100, or 200 micron (or custom micron) with micro-particle verification under digital optical microscope. Zero gravimetric technology used.',
    safetyPpe: ['Laboratory Splash Goggles', 'Nitrile Exam Gloves', 'Chemical Apron', 'Vapour Extractor'],
    equipmentRequired: ['Dedicated Ultra Fine RIG Station', 'Pulsing Turbulence Circulation Pump', 'Calibrated In-Line Filters (5, 10, 25, 50, 100, 200 μm)', 'Digital Optical Microscope (100x–500x)'],
    criticalParameters: [
      { label: 'Cleaning Specification', value: 'Choice of 5, 10, 25, 50, 100, 200 μm', tolerance: 'User selectable' },
      { label: 'Analysis Methodology', value: 'Microscopic Particle Count (0 Gravimetric)', tolerance: 'Digital Optical' },
      { label: 'Apex 1.0 Cleanliness', value: 'Class CCC or better (Zero above threshold)', tolerance: 'Strict' }
    ],
    steps: [
      { stepNumber: 1, title: 'Ultra Fine RIG Coupling', detail: 'Connect component to dedicated Ultra Fine RIG high-flow circulation manifold using precision quick-disconnect couplings.' },
      { stepNumber: 2, title: 'Select Cleaning Specification', detail: 'Set required micron threshold (5, 10, 25, 50, 100, 200 μm or custom) corresponding to customer and component classification.' },
      { stepNumber: 3, title: 'High-Turbulence Pulsed Hydrodynamic Cycle', detail: 'Circulate filtered Apex V1 precision cleaning fluid with cyclic flow reversals and pressure pulsations to scrub internal passages via hydrodynamic shear forces. Note: No ultrasonic transducers are utilized.' },
      { stepNumber: 4, title: 'Effluent Sample Extraction', detail: 'Extract 1000ml fluid sample downstream of component during dynamic circulation.' },
      { stepNumber: 5, title: 'Microscopic Optical Particle Count (Zero Gravimetric)', detail: 'Analyze membrane patch under calibrated digital optical microscope. Count particles at 5μm, 10μm, 25μm, 50μm, 100μm, 200μm or custom customer micron size. Gravimetric technology is strictly not used.' }
    ],
    acceptanceCriteria: 'Zero particles exceeding selected micron threshold (5, 10, 25, 50, 100, 200μm or custom); digital optical microscope verified; zero gravimetric technology used.',
    isoReference: 'Apex 1.0 Standard for Component Cleanliness (Operational equivalent to ISO 16232:2018)'
  },
  final_flush: {
    sopCode: 'SOP-DEP-06',
    revision: 'Rev 2.2 (2026)',
    title: 'High-Volume Closed Loop System Flush & Dry Inert Purge',
    stageName: 'Stage 06: Main Cleaning RIG Flushing',
    scope: 'Circulation of pre-filtered ISO VG 32 or calibration fluid through 3-micron absolute polished polishing filters to sweep remaining wash residues.',
    safetyPpe: ['Safety Eyewear', 'Chemical Gloves', 'Ear Defenders'],
    equipmentRequired: ['Master Cleaning Flush Rig', 'Dual 3-Micron Absolute Beta-1000 Filter Pods', 'Dry N2 Purge Line'],
    criticalParameters: [
      { label: 'Flush Duration', value: '300 Seconds (5 Minutes)', tolerance: 'Min 300 sec' },
      { label: 'Filtration Absolute Rating', value: '3 Micron (β3 ≥ 1000)', tolerance: 'Mandatory' },
      { label: 'Line Flow Velocity', value: '26.5 LPM', tolerance: '±1.5 LPM' }
    ],
    steps: [
      { stepNumber: 1, title: 'Coupling to Flush Manifold', detail: 'Attach flush hoses. Verify bypass valve is fully seated so all fluid passes through polishing filters.' },
      { stepNumber: 2, title: 'Execute Timed 5-Minute Flush Cycle', detail: 'Start pump and initiate countdown timer. Monitor filter delta-P gauge throughout cycle.' },
      { stepNumber: 3, title: 'Directional Reverse Sweep', detail: 'Toggle flow vector switch at midpoint (150s) to backflush passages and release any lodged fibers.' },
      { stepNumber: 4, title: 'Dry Nitrogen Line Purge', detail: 'Blow down fluid with dry N2 at 2.0 Bar to evacuate residual oil before thermal dehydration.' }
    ],
    acceptanceCriteria: 'Full 300 seconds completed without filter bypass; effluent clarity verified via optical inline sensor.',
    isoReference: 'ISO 4406 Hydraulic Fluid Cleanliness Code'
  },
  oven: {
    sopCode: 'SOP-DEP-07',
    revision: 'Rev 2.0 (2026)',
    title: 'Controlled Chamber Thermal Dehydration Profile (Particle Science Standard)',
    stageName: 'Stage 07: Thermal Dehydration Oven Profile',
    scope: 'Removal of all internal aqueous and solvent moisture pockets through isothermal chamber heating per Particle Science Standard Thermal Profile.',
    safetyPpe: ['Kevlar Heat-Resistant Gauntlets (rated 250°C)', 'Safety Eyewear', 'Safety Shoes'],
    equipmentRequired: ['Industrial Convection Drying Oven Chamber #1', 'Dual Calibrated PT100 Temperature Sensors', 'Moisture Hygrometer'],
    criticalParameters: [
      { label: 'Governing Standard', value: 'Particle Science Standard Thermal Profile', tolerance: 'Mandatory' },
      { label: 'Chamber Temperature', value: '110°C – 120°C', tolerance: '±3°C' },
      { label: 'Bakeout Duration', value: '120 Minutes (2.0 Hours)', tolerance: 'Min 120 mins' },
      { label: 'Residual Moisture Target', value: '< 20 PPM', tolerance: 'Max allowable' }
    ],
    steps: [
      { stepNumber: 1, title: 'Pre-Heating & Shelf Load', detail: 'Ensure oven has reached stable setpoint (120°C). Position component horizontally on non-marring stainless wire rack.' },
      { stepNumber: 2, title: 'Isothermal Thermal Bake Cycle', detail: 'Initiate calibrated bakeout timer. Maintain forced convection airflow through open port bungs.' },
      { stepNumber: 3, title: 'Cooldown & Moisture Verification', detail: 'Transfer to clean laminar cooling booth. Perform digital hygrometer probe check on internal port gas.' }
    ],
    acceptanceCriteria: 'Full 120-minute bakeout executed per Particle Science Standard; post-bake moisture reading < 20 PPM; zero fin distortion.',
    isoReference: 'Particle Science Standard & Bicester Workshop QA-2026 Protocol'
  },
  gilling: {
    sopCode: 'SOP-DEP-09',
    revision: 'Rev 3.0 (2026)',
    title: 'Manual Fin Straightening & Core Dressing (Zero Jigs Used)',
    stageName: 'Stage 09: Manual Fin Straightening (100% Hand Job — No Jigs Used)',
    scope: 'Strictly manual bench craftsmanship realignment of bent, pinched, or distorted heat sink array fins using precision hand fin combs and tweezers. We do not use any jig for it; it is exclusively a manual job with zero mechanical holding fixtures.',
    safetyPpe: ['Anti-Cut Kevlar Gloves (Level 4)', 'Magnifying Inspection Lamp', 'Safety Eyewear'],
    equipmentRequired: ['Handheld Fin Straightener Combs (Pitch-Specific)', 'Precision Tweezers & Dental Probes', 'White Light Inspection Lamp (100% Hand Job — No Jigs)'],
    criticalParameters: [
      { label: 'Fin Pitch Matching', value: 'Exact core louvre match (16-24 FPI)', tolerance: 'Zero fin tearing' },
      { label: 'Open Airflow Surface', value: '≥ 98.5% Unobstructed Face Area', tolerance: 'Min allowable' },
      { label: 'Manual Tooling Rule', value: '100% Hand Craft (No Jigs)', tolerance: 'Mandatory' }
    ],
    steps: [
      { stepNumber: 1, title: 'Grid Surface Mapping', detail: 'Map matrix face into quadrant zones under 10x optical magnifier lamp. Identify bent or impacted fins.' },
      { stepNumber: 2, title: 'Manual Hand Comb Realignment', detail: 'Insert handheld pitch-matched Delrin fin comb into root channel by hand. Smoothly guide across face to restore perpendicular louvres. We do not use any jig for it.' },
      { stepNumber: 3, title: 'Hand Tweezers & Probe Fin Separation', detail: 'Use fine titanium tweezers and dental probes to gently separate adjacent pinched fins without abrading thin-wall aluminium tubes.' },
      { stepNumber: 4, title: 'Light Box Transillumination Check', detail: 'Inspect core over white light bench table. Verify uniform light transmission and laminar airflow across 100% of core surface.' }
    ],
    acceptanceCriteria: 'All bent fins manually straightened by hand; zero mechanical jigs used (100% manual job); zero tube wall penetration or foil tearing; ≥ 98.5% open face area restored.',
    isoReference: 'Bicester Workshop QA-2026 Step 15 Protocol'
  },
  sign_off: {
    sopCode: 'SOP-DEP-09',
    revision: 'Rev 3.0 (2026)',
    title: 'Post-Overhaul Quality Audit, Nitrogen Sealing & Dispatch Release',
    stageName: 'Stage 09: Final QA Audit & Dispatch Release',
    scope: 'Comprehensive end-of-line verification, dry nitrogen inert purge, installation of new Particle Science port bungs, certificate generation, and release sign-off.',
    safetyPpe: ['Cleanroom Nitrile Gloves', 'Safety Eyewear', 'Cleanroom ESD Smock'],
    equipmentRequired: ['High-Purity Dry N2 Charging Rig', 'New Particle Science Flange Bungs', 'Digital Caliper'],
    criticalParameters: [
      { label: 'Dry N2 Gas Purge', value: '100% Purged & Sealed', tolerance: 'Mandatory' },
      { label: 'Bicester QA Sheet Sign-Off', value: '16 Operational Steps Signed', tolerance: '100% Complete' },
      { label: 'Release Authorization', value: 'Lead QC Stamp & Signature', tolerance: 'Zero defects' }
    ],
    steps: [
      { stepNumber: 1, title: '16-Step Bicester Check-In Sheet Audit', detail: 'Audit all 16 process steps on document PS-WORKBENCH-QA-2026. Verify all technician initials and test data entries are present.' },
      { stepNumber: 2, title: 'Dry Inert Gas Line Purge', detail: 'Purge component with high-purity dry nitrogen (N2) to displace atmospheric air and prevent oxidation during transit.' },
      { stepNumber: 3, title: 'Install New Particle Science Port Bungs', detail: 'Immediately seal all ports with brand-new Particle Science protective caps. Verify airtight friction fit.' },
      { stepNumber: 4, title: 'Generate Certificate of Conformance', detail: 'Review final particle cleanliness patch, 5-point flow test curve, and hydrostatic zero-leak proof report. Issue digital Conformance Certificate.' },
      { stepNumber: 5, title: 'Lead Inspector Authorization Sign-Off', detail: 'Sign and apply lead QA dispatch stamp to authorize formal shipping release.' }
    ],
    acceptanceCriteria: 'All 16 steps conforming; port bungs securely installed; certificate issued; dispatch authorized.',
    isoReference: 'ISO 9001:2015 Clause 8.6 Release of Products and Services'
  }
};

interface StepSopViewerProps {
  stepId: StepId;
  compact?: boolean;
}

export const StepSopViewer: React.FC<StepSopViewerProps> = ({ stepId, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const sop = STEP_SOPS[stepId];

  if (!sop) return null;

  return (
    <>
      {/* Compact Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-amber-500/30 hover:border-amber-400 transition-all cursor-pointer shadow-xs"
        title={`View Standard Operating Procedure: ${sop.sopCode}`}
      >
        <BookOpen className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        <span>SOP: {sop.sopCode}</span>
        <span className="text-[10px] text-neutral-400 hidden sm:inline">({sop.revision})</span>
      </button>

      {/* Full Modal Viewer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 flex items-center justify-center animate-fadeIn no-print">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-[94vw] lg:max-w-4xl xl:max-w-5xl p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[calc(100vh-2rem)] flex flex-col min-h-0 overflow-y-auto my-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-neutral-800 gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {sop.sopCode}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">{sop.revision}</span>
                  <span className="text-xs text-neutral-500">·</span>
                  <span className="text-xs text-emerald-400 font-mono font-bold">{sop.isoReference}</span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {sop.title}
                </h3>
                <p className="text-xs text-neutral-400 font-mono">
                  {sop.stageName}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 rounded-lg flex items-center gap-1.5 transition-colors border border-neutral-700 cursor-pointer shadow-xs"
                  title="Print SOP Document"
                >
                  <Printer className="h-3.5 w-3.5 text-neutral-300" />
                  <span>Print SOP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scope */}
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-300 leading-relaxed">
              <strong className="text-amber-400 font-mono uppercase block mb-0.5 text-[11px]">SOP Operational Scope:</strong>
              {sop.scope}
            </div>

            {/* Safety & PPE Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-300 uppercase text-[11px] font-mono">
                  <HardHat className="h-3.5 w-3.5" />
                  <span>Mandatory PPE & Safety</span>
                </div>
                <ul className="space-y-1 text-neutral-300 text-[11px]">
                  {sop.safetyPpe.map((ppe, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>{ppe}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-sky-300 uppercase text-[11px] font-mono">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Equipment & Tooling</span>
                </div>
                <ul className="space-y-1 text-neutral-300 text-[11px]">
                  {sop.equipmentRequired.map((eq, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" />
                      <span>{eq}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Critical Process Parameters Table */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono font-bold uppercase text-neutral-300 block">
                Critical Quality Control Standards & Tolerances:
              </span>
              <div className="border border-neutral-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-950 text-neutral-400 font-mono text-[10px] uppercase border-b border-neutral-800">
                    <tr>
                      <th className="py-2 px-3">Parameter</th>
                      <th className="py-2 px-3">Standard Nominal Value</th>
                      <th className="py-2 px-3">Tolerance Limit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80 font-mono text-xs text-neutral-200">
                    {sop.criticalParameters.map((p, idx) => (
                      <tr key={idx} className="hover:bg-neutral-800/40">
                        <td className="py-2 px-3 font-semibold text-neutral-100">{p.label}</td>
                        <td className="py-2 px-3 text-amber-300">{p.value}</td>
                        <td className="py-2 px-3 text-neutral-400">{p.tolerance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Numbered SOP Sequence */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase text-neutral-300 block">
                Standard Operational Execution Sequence:
              </span>
              <div className="space-y-2">
                {sop.steps.map((st, sIdx) => (
                  <div key={`sop-step-${st.stepNumber}-${sIdx}`} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] flex items-center justify-center border border-amber-500/30 shrink-0">
                        {st.stepNumber}
                      </span>
                      <span className="font-bold text-neutral-100">{st.title}</span>
                    </div>
                    <p className="text-neutral-300 pl-7 text-[11.5px] leading-relaxed">
                      {st.detail}
                    </p>
                    {st.caution && (
                      <div className="ml-7 mt-1 text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded flex items-center gap-1.5 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        <span>CAUTION: {st.caution}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Acceptance Criteria Footer */}
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-300 font-mono uppercase text-[11px] block">
                  Mandatory Stage Acceptance Criteria:
                </span>
                <p className="text-emerald-200/90 text-[11.5px] mt-0.5 leading-relaxed">
                  {sop.acceptanceCriteria}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close SOP Reference
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
