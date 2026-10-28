import { ComponentType } from '../types/process';

/**
 * Standard Pressure Test Targets per Component Specification:
 * - Water Radiator: 3.0 Bar
 * - Oil Cooler: 10.0 Bar
 * - Intercooler (Charge Air Cooler): 2.0 Bar
 * - Combi / Other Heat Exchangers: 3.0 Bar (or sub-circuit specific)
 */
export const COMPONENT_PRESSURE_TARGETS = {
  water_radiator: 3.0,
  oil_cooler: 10.0,
  intercooler: 2.0,
  combi_2_unit: 3.0,
  combi_3_unit: 3.0,
  heat_exchanger: 3.0,
} as const;

/**
 * Returns the automatic proof pressure test target in Bar for any given component type.
 * Enforces:
 *   - Water Radiators -> 3.0 Bar
 *   - Oil Coolers -> 10.0 Bar
 *   - Intercoolers -> 2.0 Bar
 */
export function getDefaultPressureForComponent(componentType?: ComponentType | string | null): number {
  if (!componentType) return 3.0;
  const t = String(componentType).toLowerCase().trim();

  // 1. Oil Coolers -> strictly 10.0 Bar
  if (
    t === 'oil_cooler' ||
    t === 'oil' ||
    t.includes('oil_cooler') ||
    t.includes('oil cooler') ||
    t.includes('oil') ||
    t.startsWith('oc-') ||
    t.startsWith('oc_')
  ) {
    return 10.0;
  }

  // 2. Intercoolers / Charge Air Coolers -> strictly 2.0 Bar
  if (
    t === 'intercooler' ||
    t === 'cac' ||
    t.includes('intercooler') ||
    t.includes('charge air') ||
    t.includes('charge_air') ||
    t.includes('charge-air') ||
    t.includes('cac') ||
    t.startsWith('ic-') ||
    t.startsWith('cac-')
  ) {
    return 2.0;
  }

  // 3. Water Radiators / Heat Exchangers -> strictly 3.0 Bar
  if (
    t === 'water_radiator' ||
    t === 'radiator' ||
    t === 'rad' ||
    t.includes('water') ||
    t.includes('radiator') ||
    t.startsWith('rad-') ||
    t.startsWith('wr-')
  ) {
    return 3.0;
  }

  return 3.0;
}

/**
 * Returns formatted label with bar and equivalent psi
 */
export function formatPressureWithPsi(bar: number): string {
  const psi = Math.round(bar * 14.5038 * 10) / 10;
  return `${bar.toFixed(1)} Bar (${psi} PSI)`;
}
