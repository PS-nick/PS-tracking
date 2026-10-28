export type RacingCategoryId = 
  | 'formula1'
  | 'wec_hypercar'
  | 'indycar'
  | 'wrc_rally'
  | 'formula_e'
  | 'gt3_imsa'
  | 'motogp'
  | 'historic';

export interface RacingCategoryConfig {
  id: RacingCategoryId;
  label: string;
  shortLabel: string;
  badge: string;
  governingBody: string; // e.g. "FIA", "IMSA", "IndyCar", "FIM"
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  racingTypes: string[];
  sampleComponents: { partNumber: string; modelName: string; fluidType: string }[];
  teams: string[];
}

export const MOTORSPORT_CATEGORIES: Record<RacingCategoryId, RacingCategoryConfig> = {
  formula1: {
    id: 'formula1',
    label: 'Formula 1 (FIA World Championship)',
    shortLabel: 'Formula 1',
    badge: 'F1 Grand Prix',
    governingBody: 'FIA F1 Technical Regulations',
    description: 'Premier Grand Prix single-seater world championship · Ultra-high pressure hydraulics',
    badgeBg: 'bg-red-500/15',
    badgeText: 'text-red-400',
    badgeBorder: 'border-red-500/40',
    dotColor: 'bg-red-500',
    racingTypes: [
      'Grand Prix & Sprint Weekend',
      'Monocoque Power Steering (PAS)',
      'Brake-By-Wire (BBW) Hydraulics',
      'Power Unit MGU Energy Recovery',
      'DRS Hydraulic Actuator',
    ],
    sampleComponents: [
      { partNumber: 'F1-PAS-940', modelName: 'F1 Hydraulic Power Steering Actuator', fluidType: 'AeroShell Fluid 41 / ISO VG 15' },
      { partNumber: 'PSTS-FFM-300', modelName: 'High-Precision Fuel Flow Metering Valve', fluidType: 'Calibration Solvent (Apex 1.0 / Eq. ISO 16232)' },
      { partNumber: 'F1-BBW-08', modelName: 'Brake-By-Wire Electro-Hydraulic Master Block', fluidType: 'Castrol React SRF Racing Brake Fluid' },
    ],
    teams: [
      'Red Bull Racing Powertrains',
      'Scuderia Ferrari HP',
      'Mercedes-AMG Petronas F1 Team',
      'McLaren F1 Team',
      'Aston Martin Aramco F1 Team',
      'Williams Grand Prix Engineering',
      'BWT Alpine F1 Team',
      'Stake F1 Team Kick Sauber',
      'Visa Cash App RB F1 Team',
      'MoneyGram Haas F1 Team',
    ],
  },
  wec_hypercar: {
    id: 'wec_hypercar',
    label: 'FIA WEC / Hypercar (Le Mans & LMDh)',
    shortLabel: 'WEC Hypercar',
    badge: 'WEC / Le Mans',
    governingBody: 'ACO / FIA WEC Homologation',
    description: '24 Hours of Le Mans & World Endurance Championship · 24h continuous thermal endurance',
    badgeBg: 'bg-sky-500/15',
    badgeText: 'text-sky-400',
    badgeBorder: 'border-sky-500/40',
    dotColor: 'bg-sky-400',
    racingTypes: [
      'THOR Hypercar Endurance Protocol',
      '24 Hours of Le Mans Endurance',
      '6h / 8h World Endurance Championship',
      'IMSA GTP 24h Daytona & 12h Sebring',
      'Hypercar Active Aerodynamics & Suspension',
      'THOR WEC Le Mans',
    ],
    sampleComponents: [
      { partNumber: 'THOR-HEX-01', modelName: 'THOR WEC Hypercar Core Radiator Matrix', fluidType: 'Motul 300V Competition ISO VG 22' },
      { partNumber: 'WEC-ASV-24', modelName: 'Hypercar 24h Active Suspension Damper Valve', fluidType: 'Motul 300V Competition ISO VG 22' },
      { partNumber: 'LMH-FSV-02', modelName: 'Le Mans Hybrid Fuel Scavenge Pump Unit', fluidType: 'Calibration Oil ISO VG 32' },
      { partNumber: 'LMDh-GBX-12', modelName: 'Xtrac Transverse Gearbox Hydraulic Actuator', fluidType: 'Mobil 1 Racing Gear Oil' },
    ],
    teams: [
      'THOR',
      'THOR Racing / WEC Team',
      'THOR Motorsport',
      'Porsche Penske Motorsport (963)',
      'Ferrari AF Corse (499P)',
      'Toyota Gazoo Racing (GR010)',
      'Cadillac Racing (V-Series.R)',
      'Alpine Endurance Team (A424)',
      'BMW M Team WRT (M Hybrid V8)',
      'Peugeot TotalEnergies (9X8)',
      'Hertz Team JOTA (Porsche 963)',
    ],
  },
  indycar: {
    id: 'indycar',
    label: 'NTT IndyCar Series',
    shortLabel: 'IndyCar',
    badge: 'IndyCar Series',
    governingBody: 'IndyCar Technical Homologation',
    description: 'High-speed superspeedways (Indy 500), road courses, and street circuits · 230+ mph oval strain',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/40',
    dotColor: 'bg-amber-400',
    racingTypes: [
      'Indianapolis 500 (2.5mi Oval)',
      'Superspeedway & Short Oval',
      'Road & Street Course Grand Prix',
      'Twin-Turbo 2.2L E85 Fuel Delivery',
    ],
    sampleComponents: [
      { partNumber: 'IC-TWA-10', modelName: 'IndyCar Twin-Turbo Dual Wastegate Valve', fluidType: 'Pennzoil Ultra Platinum ISO VG 32' },
      { partNumber: 'IC-FPU-04', modelName: 'IndyCar High-Pressure Fuel Rail Assembly', fluidType: 'E85 Calibration Fluid' },
      { partNumber: 'IC-DAM-08', modelName: 'Ohlins TTX40 Through-Rod Damper Assembly', fluidType: 'Ohlins Shock Fluid 1309' },
    ],
    teams: [
      'Team Penske IndyCar',
      'Chip Ganassi Racing',
      'Arrow McLaren IndyCar',
      'Andretti Global',
      'Rahal Letterman Lanigan Racing',
      'Meyer Shank Racing',
      'Ed Carpenter Racing',
      'Juncos Hollinger Racing',
    ],
  },
  wrc_rally: {
    id: 'wrc_rally',
    label: 'FIA WRC / Rally1 Hybrid',
    shortLabel: 'WRC Rally1',
    badge: 'WRC Rally1',
    governingBody: 'FIA WRC Technical Appendix',
    description: 'World Rally Championship · Extreme gravel, snow, and jumps with rapid hydraulic shocks',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/40',
    dotColor: 'bg-emerald-400',
    racingTypes: [
      'Rough Gravel & Jump Stages (Rally Finland)',
      'Snow & Ice High Latitude (Rally Sweden)',
      'Alpine Asphalt Mountain Passes (Rally Monte Carlo)',
      'Active Center Differential & Handbrake Release',
    ],
    sampleComponents: [
      { partNumber: 'WRC-CDV-01', modelName: 'Rally1 Electro-Hydraulic Center Diff Valve', fluidType: 'TotalEnergies Fluidmatic ISO VG 32' },
      { partNumber: 'WRC-PAS-05', modelName: 'WRC Fast-Ratio Hydraulic Steering Rack Unit', fluidType: 'Castrol Syntrans Transaxle' },
      { partNumber: 'WRC-SUS-09', modelName: 'Reiger 5-Way Hydraulic Bump Stop Damper', fluidType: 'Reiger Racing Damper Fluid' },
    ],
    teams: [
      'Toyota Gazoo Racing WRT (Yaris Rally1)',
      'Hyundai Motorsport (i20 N Rally1)',
      'M-Sport Ford World Rally Team (Puma Rally1)',
    ],
  },
  formula_e: {
    id: 'formula_e',
    label: 'ABB FIA Formula E World Championship',
    shortLabel: 'Formula E',
    badge: 'Formula E Gen3',
    governingBody: 'FIA Formula E Technical Passport',
    description: 'All-electric single-seater street circuit championship · Fast hydraulic regen blending',
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/40',
    dotColor: 'bg-cyan-400',
    racingTypes: [
      'Urban Street Circuit E-Prix',
      'Front Powertrain Hydraulic Regen Blending',
      'Dielectric Coolant Circuit Flush',
    ],
    sampleComponents: [
      { partNumber: 'FE-HBR-03', modelName: 'Formula E Gen3 Front Brake Regulating Unit', fluidType: 'Dielectric Cooling Fluid (Apex 1.0 / Eq. ISO 16232)' },
      { partNumber: 'FE-INV-07', modelName: 'Silicon-Carbide Inverter Coolant Manifold', fluidType: 'Shell EV Thermal Fluid' },
    ],
    teams: [
      'TAG Heuer Porsche Formula E Team',
      'Jaguar TCS Racing',
      'Nissan Formula E Team',
      'DS Penske Formula E',
      'Andretti Formula E',
      'Maserati MSG Racing',
      'Envision Racing',
      'NEOM McLaren Formula E Team',
    ],
  },
  gt3_imsa: {
    id: 'gt3_imsa',
    label: 'GT3 / IMSA SportsCar & 24h Endurance',
    shortLabel: 'GT3 / IMSA',
    badge: 'GT3 / IMSA',
    governingBody: 'SRO / IMSA GTD Homologation',
    description: 'GT3 customer racing & IMSA WeatherTech Championship · 24h Daytona, Nürburgring, Spa',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-400',
    badgeBorder: 'border-purple-500/40',
    dotColor: 'bg-purple-400',
    racingTypes: [
      '24 Hours of Daytona GTD Pro',
      'Nürburgring 24h Nordschleife',
      'CrowdStrike 24 Hours of Spa',
      'Bathurst 12 Hour Mount Panorama',
    ],
    sampleComponents: [
      { partNumber: 'GT3-ABS-M5', modelName: 'Motorsport Bosch M5 Monoblock ABS Valve Block', fluidType: 'Endurance DOT 5.1 Racing Fluid' },
      { partNumber: 'GT3-AIR-02', modelName: 'Krontec High-Speed Air Jack Pneumatic Valve', fluidType: 'Compressed Nitrogen / ISO VG 10' },
      { partNumber: 'GT3-PAS-06', modelName: 'Electro-Hydraulic Power Steering Pump Unit', fluidType: 'Pentosin CHF 11S Hydraulic Fluid' },
    ],
    teams: [
      'Manthey EMA (Porsche 911 GT3 R)',
      'AF Corse (Ferrari 296 GT3)',
      'Corvette Racing by Pratt Miller (Z06 GT3.R)',
      'Iron Lynx (Lamborghini Huracán GT3 EVO2)',
      'Team WRT (BMW M4 GT3)',
      'Walkenhorst Motorsport (Aston Martin Vantage)',
    ],
  },
  motogp: {
    id: 'motogp',
    label: 'MotoGP World Championship',
    shortLabel: 'MotoGP',
    badge: 'MotoGP / FIM',
    governingBody: 'FIM Grand Prix World Championship',
    description: 'Premier prototype motorcycle racing · Rapid-drop ride-height and dry-sump scavenge units',
    badgeBg: 'bg-orange-500/15',
    badgeText: 'text-orange-400',
    badgeBorder: 'border-orange-500/40',
    dotColor: 'bg-orange-400',
    racingTypes: [
      'MotoGP Grand Prix & Sprint',
      'Holeshot & Ride-Height Device (RHD)',
      'Dry-Sump Scavenge & Oil Separation',
      'Brembo Monoblock Carbon Hydraulic Master',
    ],
    sampleComponents: [
      { partNumber: 'MGP-RHD-04', modelName: 'MotoGP Hydraulic Ride-Height Drop Device', fluidType: 'Brembo Racing LCF 600 Plus' },
      { partNumber: 'MGP-SCP-02', modelName: 'Prototype 4-Stage Dry Sump Scavenge Pump', fluidType: 'Motul 300V Factory Line 10W-40' },
    ],
    teams: [
      'Ducati Lenovo Team',
      'Red Bull KTM Factory Racing',
      'Aprilia Racing',
      'Monster Energy Yamaha MotoGP',
      'Repsol Honda Team',
      'Gresini Racing MotoGP (Ducati)',
      'Pertamina Enduro VR46 Racing Team',
    ],
  },
  historic: {
    id: 'historic',
    label: 'Historic & Heritage Motorsport (Goodwood, Le Mans Classic, FIA Masters)',
    shortLabel: 'Historic',
    badge: 'Historic Racing',
    governingBody: 'FIA Historic Motorsport / Appendix K',
    description: 'Vintage & classic racing vehicles · Classic Formula 1, Group C, Historic GT, Pre-War and Goodwood Revival',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/40',
    dotColor: 'bg-amber-500',
    racingTypes: [
      'Goodwood Revival & Members Meeting',
      'Le Mans Classic 24h Legends',
      'Masters Historic Formula One (DFV Era)',
      'Group C Racing & IMSA GTP Classic',
      'Monaco Historic Grand Prix',
      'Tour Auto & Mille Miglia Storica',
    ],
    sampleComponents: [
      { partNumber: 'HST-RAD-70', modelName: 'Classic DFV Marston Water Radiator Core', fluidType: 'Evans Waterless Classic Coolant' },
      { partNumber: 'HST-OIL-68', modelName: 'Serck Vintage Round Tube Oil Cooler', fluidType: 'Millers Classic 20W-50 Racing Oil' },
      { partNumber: 'HST-HE-82', modelName: 'Secan Aluminium Aerospace Heat Exchanger', fluidType: 'AeroShell Fluid 41' },
    ],
    teams: [
      'Classic Team Lotus',
      'Goodwood Revival Heritage Racing',
      'BRM Historic Engineering',
      'Masters Historic Racing Squad',
      'Heritage Motorsport Collection Bicester',
      'Cosworth DFV Heritage Works',
      'Jaguar Classic Challenge Team',
      'Ferrari Classiche Technical Depot',
      'Porsche Historic & Heritage Works',
      'Matra Classic V12 Racing',
    ],
  },
};

export const ALL_RACING_CATEGORIES = Object.values(MOTORSPORT_CATEGORIES);

/**
 * Returns all motorsport teams across all racing categories as a flat list
 */
export const ALL_MOTORSPORT_TEAMS = ALL_RACING_CATEGORIES.flatMap((c) => c.teams);

/**
 * Team Constructor Tier: Works vs Customer/Privateer
 */
export type TeamTier = 'works' | 'customer';

export interface TeamMetadata {
  name: string;
  categoryId: RacingCategoryId;
  tier: TeamTier;
  tierLabel: string;
  subCategory: string;
  shortName: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const TEAM_METADATA_MAP: Record<string, { tier: TeamTier; subCategory: string; shortName: string }> = {
  // Formula 1
  'Red Bull Racing Powertrains': { tier: 'works', subCategory: 'Factory Works Powertrains', shortName: 'Red Bull' },
  'Scuderia Ferrari HP': { tier: 'works', subCategory: 'Factory Works Scuderia', shortName: 'Ferrari' },
  'Mercedes-AMG Petronas F1 Team': { tier: 'works', subCategory: 'Factory Works High Performance', shortName: 'Mercedes-AMG' },
  'BWT Alpine F1 Team': { tier: 'works', subCategory: 'Factory Works Constructor', shortName: 'Alpine' },
  'McLaren F1 Team': { tier: 'customer', subCategory: 'Customer Racing Partner', shortName: 'McLaren' },
  'Aston Martin Aramco F1 Team': { tier: 'customer', subCategory: 'Customer Works Partner', shortName: 'Aston Martin' },
  'Williams Grand Prix Engineering': { tier: 'customer', subCategory: 'Independent Customer Constructor', shortName: 'Williams' },
  'Stake F1 Team Kick Sauber': { tier: 'customer', subCategory: 'Customer Team (Audi Transition)', shortName: 'Sauber' },
  'Visa Cash App RB F1 Team': { tier: 'customer', subCategory: 'Sister Development Team', shortName: 'VCARB' },
  'MoneyGram Haas F1 Team': { tier: 'customer', subCategory: 'Independent Customer Entry', shortName: 'Haas F1' },

  // WEC / Hypercar
  'Porsche Penske Motorsport (963)': { tier: 'works', subCategory: 'Factory Works LMDh', shortName: 'Porsche Penske' },
  'Ferrari AF Corse (499P)': { tier: 'works', subCategory: 'Factory Works LMH', shortName: 'Ferrari 499P' },
  'Toyota Gazoo Racing (GR010)': { tier: 'works', subCategory: 'Factory Works Hybrid LMH', shortName: 'Toyota Gazoo' },
  'Cadillac Racing (V-Series.R)': { tier: 'works', subCategory: 'Factory Works LMDh', shortName: 'Cadillac' },
  'Alpine Endurance Team (A424)': { tier: 'works', subCategory: 'Factory Works LMDh', shortName: 'Alpine WEC' },
  'BMW M Team WRT (M Hybrid V8)': { tier: 'works', subCategory: 'Factory Works LMDh', shortName: 'BMW M WRT' },
  'Peugeot TotalEnergies (9X8)': { tier: 'works', subCategory: 'Factory Works LMH Wingless', shortName: 'Peugeot 9X8' },
  'Hertz Team JOTA (Porsche 963)': { tier: 'customer', subCategory: 'Privateer Hypercar Client', shortName: 'Team JOTA' },

  // IndyCar
  'Team Penske IndyCar': { tier: 'works', subCategory: 'Factory Supported Chevrolet', shortName: 'Penske Indy' },
  'Chip Ganassi Racing': { tier: 'works', subCategory: 'Factory Supported Honda', shortName: 'Ganassi' },
  'Arrow McLaren IndyCar': { tier: 'works', subCategory: 'Factory Supported Chevrolet', shortName: 'Arrow McLaren' },
  'Andretti Global': { tier: 'works', subCategory: 'Factory Supported Honda', shortName: 'Andretti' },
  'Rahal Letterman Lanigan Racing': { tier: 'customer', subCategory: 'Independent IndyCar Entry', shortName: 'RLL Racing' },
  'Meyer Shank Racing': { tier: 'customer', subCategory: 'Technical Alliance Team', shortName: 'Meyer Shank' },
  'Ed Carpenter Racing': { tier: 'customer', subCategory: 'Independent Oval Specialist', shortName: 'Ed Carpenter' },
  'Juncos Hollinger Racing': { tier: 'customer', subCategory: 'Independent IndyCar Entry', shortName: 'Juncos' },

  // WRC Rally
  'Toyota Gazoo Racing WRT (Yaris Rally1)': { tier: 'works', subCategory: 'Factory Works Rally1', shortName: 'Toyota WRC' },
  'Hyundai Motorsport (i20 N Rally1)': { tier: 'works', subCategory: 'Factory Works Rally1', shortName: 'Hyundai WRC' },
  'M-Sport Ford World Rally Team (Puma Rally1)': { tier: 'customer', subCategory: 'Semi-Works Ford Partner', shortName: 'M-Sport Ford' },

  // Formula E
  'TAG Heuer Porsche Formula E Team': { tier: 'works', subCategory: 'Factory Works Gen3', shortName: 'Porsche FE' },
  'Jaguar TCS Racing': { tier: 'works', subCategory: 'Factory Works Gen3', shortName: 'Jaguar FE' },
  'Nissan Formula E Team': { tier: 'works', subCategory: 'Factory Works Gen3', shortName: 'Nissan FE' },
  'DS Penske Formula E': { tier: 'works', subCategory: 'Factory Works Gen3', shortName: 'DS Penske' },
  'Andretti Formula E': { tier: 'customer', subCategory: 'Customer Porsche Powertrain', shortName: 'Andretti FE' },
  'Maserati MSG Racing': { tier: 'customer', subCategory: 'Customer Stellantis Powertrain', shortName: 'Maserati MSG' },
  'Envision Racing': { tier: 'customer', subCategory: 'Customer Jaguar Powertrain', shortName: 'Envision' },
  'NEOM McLaren Formula E Team': { tier: 'customer', subCategory: 'Customer Nissan Powertrain', shortName: 'McLaren FE' },

  // GT3 / IMSA
  'Manthey EMA (Porsche 911 GT3 R)': { tier: 'works', subCategory: 'Factory Works GT3 Squad', shortName: 'Manthey EMA' },
  'AF Corse (Ferrari 296 GT3)': { tier: 'works', subCategory: 'Factory Works GT3 Squad', shortName: 'AF Corse GT3' },
  'Corvette Racing by Pratt Miller (Z06 GT3.R)': { tier: 'works', subCategory: 'Factory Works IMSA Squad', shortName: 'Corvette Racing' },
  'Iron Lynx (Lamborghini Huracán GT3 EVO2)': { tier: 'customer', subCategory: 'Customer GT3 Squad', shortName: 'Iron Lynx' },
  'Team WRT (BMW M4 GT3)': { tier: 'customer', subCategory: 'Customer GT3 Squad', shortName: 'Team WRT GT3' },
  'Walkenhorst Motorsport (Aston Martin Vantage)': { tier: 'customer', subCategory: 'Privateer GT3 Squad', shortName: 'Walkenhorst' },

  // MotoGP
  'Ducati Lenovo Team': { tier: 'works', subCategory: 'Factory Works Desmosedici', shortName: 'Ducati Lenovo' },
  'Red Bull KTM Factory Racing': { tier: 'works', subCategory: 'Factory Works RC16', shortName: 'KTM Factory' },
  'Aprilia Racing': { tier: 'works', subCategory: 'Factory Works RS-GP', shortName: 'Aprilia Factory' },
  'Monster Energy Yamaha MotoGP': { tier: 'works', subCategory: 'Factory Works YZR-M1', shortName: 'Yamaha MotoGP' },
  'Repsol Honda Team': { tier: 'works', subCategory: 'Factory Works RC213V', shortName: 'Repsol Honda' },
  'Gresini Racing MotoGP (Ducati)': { tier: 'customer', subCategory: 'Satellite Customer Team', shortName: 'Gresini Ducati' },
  'Pertamina Enduro VR46 Racing Team': { tier: 'customer', subCategory: 'Satellite Customer Team', shortName: 'VR46 Racing' },

  // Historic & Heritage Motorsport
  'Classic Team Lotus': { tier: 'works', subCategory: 'Works Heritage F1 Squad', shortName: 'Classic Lotus' },
  'Goodwood Revival Heritage Racing': { tier: 'customer', subCategory: 'Goodwood Trophy Entrant', shortName: 'Goodwood Heritage' },
  'BRM Historic Engineering': { tier: 'works', subCategory: 'Factory Heritage V16/H16', shortName: 'BRM Historic' },
  'Masters Historic Racing Squad': { tier: 'customer', subCategory: 'FIA Masters F1/Group C', shortName: 'Masters Racing' },
  'Heritage Motorsport Collection Bicester': { tier: 'customer', subCategory: 'Bicester Heritage Client', shortName: 'Bicester Heritage' },
  'Cosworth DFV Heritage Works': { tier: 'works', subCategory: 'Factory Heritage Engine Partner', shortName: 'Cosworth Heritage' },
  'Jaguar Classic Challenge Team': { tier: 'works', subCategory: 'Jaguar Heritage Works', shortName: 'Jaguar Classic' },
  'Ferrari Classiche Technical Depot': { tier: 'works', subCategory: 'Maranello Classiche Certification', shortName: 'Ferrari Classiche' },
  'Porsche Historic & Heritage Works': { tier: 'works', subCategory: 'Porsche Museum Motorsport', shortName: 'Porsche Heritage' },
  'Matra Classic V12 Racing': { tier: 'customer', subCategory: 'French Heritage Prototype', shortName: 'Matra Classic' },
};

export const TEAM_TIERS: { id: 'all' | TeamTier; label: string; description: string }[] = [
  { id: 'all', label: 'All Team Tiers', description: 'Factory works and customer privateer teams' },
  { id: 'works', label: 'Factory Works', description: 'Primary OEM factory constructor squads' },
  { id: 'customer', label: 'Customer / Privateer', description: 'Independent client & satellite racing teams' },
];

export const CAR_ALLOCATION_OPTIONS: { id: 'all' | 'car_1' | 'car_2' | 'spare_rig'; label: string; badge: string }[] = [
  { id: 'all', label: 'All Chassis Entries', badge: 'All' },
  { id: 'car_1', label: 'Car #1 (Lead Entry)', badge: 'Car #1' },
  { id: 'car_2', label: 'Car #2 (Sister Entry)', badge: 'Car #2' },
  { id: 'spare_rig', label: 'T-Car / Spare Rig', badge: 'T-Car/Spare' },
];

export interface CustomCustomerRecord {
  name: string;
  categoryId: RacingCategoryId;
  tier?: TeamTier;
  subCategory?: string;
  shortName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  accountNumber?: string;
  notes?: string;
  createdAt?: string;
}

const CUSTOM_CUSTOMERS_STORAGE_KEY = 'depot_custom_customers';

export function getCustomCustomers(): CustomCustomerRecord[] {
  try {
    const raw = localStorage.getItem(CUSTOM_CUSTOMERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveCustomCustomer(customer: CustomCustomerRecord): void {
  try {
    const cleanName = (customer?.name || '').trim();
    if (!cleanName) return;
    const list = getCustomCustomers();
    const filtered = list.filter((c) => (c?.name || '').toLowerCase() !== cleanName.toLowerCase());
    filtered.push({
      ...customer,
      name: cleanName,
    });
    localStorage.setItem(CUSTOM_CUSTOMERS_STORAGE_KEY, JSON.stringify(filtered));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('depot_custom_customers_changed'));
    }
  } catch (e) {
    console.warn('Failed to save custom customer', e);
  }
}

export function isCustomCustomer(customerName?: string): boolean {
  if (!customerName) return false;
  const lower = customerName.trim().toLowerCase();
  return getCustomCustomers().some((c) => (c?.name || '').trim().toLowerCase() === lower);
}

const DELETED_CUSTOMERS_STORAGE_KEY = 'depot_deleted_customers';

export function getDeletedCustomers(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_CUSTOMERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function isCustomerDeleted(name?: string): boolean {
  if (!name) return false;
  const lower = name.trim().toLowerCase();
  return getDeletedCustomers().some((d) => d.toLowerCase() === lower);
}

export function deleteCustomer(customerName: string): boolean {
  try {
    const cleanName = (customerName || '').trim();
    if (!cleanName) return false;
    const lower = cleanName.toLowerCase();

    // 1. Remove from custom customers if present
    const customList = getCustomCustomers();
    const updatedCustoms = customList.filter((c) => (c?.name || '').trim().toLowerCase() !== lower);
    localStorage.setItem(CUSTOM_CUSTOMERS_STORAGE_KEY, JSON.stringify(updatedCustoms));

    // 2. Add to deleted customers list so it is excluded from all views and dropdowns
    const deletedList = getDeletedCustomers();
    if (!deletedList.some((d) => d.toLowerCase() === lower)) {
      deletedList.push(cleanName);
      localStorage.setItem(DELETED_CUSTOMERS_STORAGE_KEY, JSON.stringify(deletedList));
    }

    // 3. Purge from any existing units in all storage locations so wrong customer does not linger
    try {
      const keys = ['protrace_sop_service_units_v1', 'depot_service_units'];
      let anyTouched = false;
      keys.forEach((storageKey) => {
        const rawUnits = localStorage.getItem(storageKey);
        if (rawUnits) {
          const units = JSON.parse(rawUnits);
          if (Array.isArray(units)) {
            let touched = false;
            const nextUnits = units.map((u: any) => {
              const uCust = (u.customerName || '').trim().toLowerCase();
              const uSupp = (u.supplierCompanyName || '').trim().toLowerCase();
              if (uCust === lower || uSupp === lower) {
                touched = true;
                return {
                  ...u,
                  customerName: uCust === lower ? 'Standard Client' : u.customerName,
                  supplierCompanyName: uSupp === lower ? 'Standard Client' : u.supplierCompanyName,
                  intake: u.intake ? {
                    ...u.intake,
                    supplierCompanyName: (u.intake.supplierCompanyName || '').trim().toLowerCase() === lower ? 'Standard Client' : u.intake.supplierCompanyName,
                  } : u.intake,
                };
              }
              return u;
            });
            if (touched) {
              anyTouched = true;
              localStorage.setItem(storageKey, JSON.stringify(nextUnits));
            }
          }
        }
      });
      if (anyTouched && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('depot_units_updated'));
      }
    } catch (e) {
      console.warn('Failed to update units for deleted customer', e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('depot_custom_customers_changed'));
    }
    return true;
  } catch (e) {
    console.warn('Failed to delete customer', e);
    return false;
  }
}

export const deleteCustomCustomer = deleteCustomer;

export function restoreCustomer(customerName: string): boolean {
  try {
    const cleanName = (customerName || '').trim().toLowerCase();
    const deletedList = getDeletedCustomers();
    const updated = deletedList.filter((d) => d.toLowerCase() !== cleanName);
    localStorage.setItem(DELETED_CUSTOMERS_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('depot_custom_customers_changed'));
    }
    return true;
  } catch (e) {
    return false;
  }
}

export function clearAllCustomCustomers(): void {
  try {
    localStorage.removeItem(CUSTOM_CUSTOMERS_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('depot_custom_customers_changed'));
    }
  } catch (e) {
    console.warn('Failed to clear custom customers', e);
  }
}

export function clearDeletedCustomers(): void {
  try {
    localStorage.removeItem(DELETED_CUSTOMERS_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('depot_custom_customers_changed'));
    }
  } catch (e) {
    console.warn('Failed to clear deleted customers', e);
  }
}

/**
 * Get all teams including saved custom customers, optionally filtered by category and excluding deleted customers
 */
export function getAllTeamsWithCustom(categoryId?: RacingCategoryId | 'all'): string[] {
  const customs = getCustomCustomers();
  const deleted = getDeletedCustomers().map((d) => d.toLowerCase());
  let baseTeams = ALL_MOTORSPORT_TEAMS;
  
  if (categoryId && categoryId !== 'all') {
    const cat = ALL_RACING_CATEGORIES.find((c) => c.id === categoryId);
    baseTeams = cat ? cat.teams : [];
    const catCustoms = customs.filter((c) => c.categoryId === categoryId).map((c) => c.name);
    return Array.from(new Set([...baseTeams, ...catCustoms])).filter((t) => !deleted.includes(t.toLowerCase()));
  }
  
  const customNames = customs.map((c) => c.name);
  return Array.from(new Set([...baseTeams, ...customNames])).filter((t) => !deleted.includes(t.toLowerCase()));
}

/**
 * Helper to get the category for a given customer/team name
 */
export function getCategoryForTeam(teamName?: string): RacingCategoryConfig | undefined {
  if (!teamName) return undefined;
  const safeName = String(teamName).trim();
  if (!safeName) return undefined;
  const lower = safeName.toLowerCase();
  const custom = getCustomCustomers().find((c) => (c?.name || '').toLowerCase() === lower);
  if (custom) {
    return ALL_RACING_CATEGORIES.find((cat) => cat.id === custom.categoryId);
  }
  return ALL_RACING_CATEGORIES.find((cat) => (cat.teams || []).some((t) => t.toLowerCase() === lower));
}

/**
 * Helper to get rich metadata for a given team
 */
export function getTeamMetadata(teamName?: string): TeamMetadata {
  const safeName = String(teamName || '').trim();
  if (!safeName) {
    return {
      name: 'Independent Team',
      categoryId: 'formula1',
      tier: 'customer',
      tierLabel: 'Customer Team',
      subCategory: 'Independent Racing Team',
      shortName: 'Client',
      badgeBg: 'bg-cyan-500/15',
      badgeText: 'text-cyan-400',
      badgeBorder: 'border-cyan-500/40',
    };
  }

  const lowerName = safeName.toLowerCase();
  const custom = getCustomCustomers().find((c) => (c?.name || '').toLowerCase() === lowerName);
  const meta = TEAM_METADATA_MAP[safeName];
  const cat = getCategoryForTeam(safeName);
  const categoryId = custom?.categoryId || (cat ? cat.id : 'formula1');
  const isWorks = lowerName.includes('factory') || lowerName.includes('works') || lowerName.includes('scuderia');
  const tier: TeamTier = custom?.tier || meta?.tier || (isWorks ? 'works' : 'customer');
  const tierLabel = tier === 'works' ? 'Factory Works' : 'Customer Team';
  const subCategory = custom?.subCategory || meta?.subCategory || (tier === 'works' ? 'Factory Works Constructor' : 'Independent Racing Team');
  const shortName = custom?.shortName || meta?.shortName || safeName.split(' ')[0] || safeName;

  const badgeBg = tier === 'works' ? 'bg-amber-500/15' : 'bg-cyan-500/15';
  const badgeText = tier === 'works' ? 'text-amber-400' : 'text-cyan-400';
  const badgeBorder = tier === 'works' ? 'border-amber-500/40' : 'border-cyan-500/40';

  return {
    name: safeName,
    categoryId,
    tier,
    tierLabel,
    subCategory,
    shortName,
    badgeBg,
    badgeText,
    badgeBorder,
  };
}

/**
 * Parse chassis or vehicle entry string to allocation subcategory
 */
export function getCarAllocationFromChassis(chassisNumber?: string): 'car_1' | 'car_2' | 'spare_rig' {
  if (!chassisNumber) return 'car_1';
  const lower = String(chassisNumber).toLowerCase();
  if (lower.includes('car #2') || lower.includes('car 2') || lower.includes('sister') || lower.includes('chassis #02') || lower.includes('chassis #12') || lower.includes('chassis #2')) {
    return 'car_2';
  }
  if (lower.includes('spare') || lower.includes('t-car') || lower.includes('reserve') || lower.includes('bench') || lower.includes('rig') || lower.includes('test')) {
    return 'spare_rig';
  }
  return 'car_1';
}
