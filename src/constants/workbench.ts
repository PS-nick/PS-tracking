import { ComponentType, CustomCoolerType } from '../types/process';

export interface ComponentTypeOption {
  id: ComponentType;
  label: string;
  description: string;
  code: string;
  isCustom?: boolean;
  defaultMedium?: string;
  defaultFlowTargetMinLpm?: number;
  defaultFlowTargetMaxLpm?: number;
  defaultPressureTargetBar?: number;
  defaultPressureHoldTimeSec?: number;
}

export const BICESTER_COMPONENT_TYPES: ComponentTypeOption[] = [
  {
    id: 'heat_exchanger',
    label: 'Heat Exchanger',
    description: 'Liquid-to-liquid / fluid cooling matrix core with internal cross-flow passages',
    code: 'HEX',
  },
  {
    id: 'water_radiator',
    label: 'Water Radiator',
    description: 'High-thermal dissipation aluminum cooling array with precision louvred fins',
    code: 'RAD',
  },
  {
    id: 'oil_cooler',
    label: 'Oil Cooler',
    description: 'Heavy-duty high-pressure oil lubrication heat dissipation exchanger',
    code: 'OCL',
  },
  {
    id: 'intercooler',
    label: 'Intercooler',
    description: 'Charged intake air charge cooler (air-to-air or water-to-air core)',
    code: 'ICL',
  },
  {
    id: 'combi_2_unit',
    label: 'Comby Unit (2 Units)',
    description: 'Dual combination matrix assembly (2 Units: e.g. Water Radiator + Oil Cooler)',
    code: 'CMB-2',
  },
  {
    id: 'combi_3_unit',
    label: 'Comby Unit (3 Units)',
    description: 'Triple combination matrix assembly (3 Units: e.g. Radiator + Oil Cooler + Gearbox Cooler)',
    code: 'CMB-3',
  },
];

const CUSTOM_COOLERS_STORAGE_KEY = 'depot_custom_cooler_types';

export function getCustomCoolerTypes(): ComponentTypeOption[] {
  try {
    const raw = localStorage.getItem(CUSTOM_COOLERS_STORAGE_KEY);
    if (!raw) return [];
    const list: CustomCoolerType[] = JSON.parse(raw);
    return list.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description || 'Custom cooler specification',
      code: c.code || 'CUST',
      isCustom: true,
      defaultMedium: c.defaultMedium,
      defaultFlowTargetMinLpm: c.defaultFlowTargetMinLpm,
      defaultFlowTargetMaxLpm: c.defaultFlowTargetMaxLpm,
      defaultPressureTargetBar: c.defaultPressureTargetBar,
      defaultPressureHoldTimeSec: c.defaultPressureHoldTimeSec,
    }));
  } catch (e) {
    console.warn('Failed to load custom cooler types from storage', e);
    return [];
  }
}

export function saveCustomCoolerType(cooler: CustomCoolerType): void {
  try {
    const raw = localStorage.getItem(CUSTOM_COOLERS_STORAGE_KEY);
    const existing: CustomCoolerType[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((c) => c.id !== cooler.id);
    filtered.push(cooler);
    localStorage.setItem(CUSTOM_COOLERS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to save custom cooler type', e);
  }
}

export function getAllComponentTypes(): ComponentTypeOption[] {
  const customs = getCustomCoolerTypes();
  return [...BICESTER_COMPONENT_TYPES, ...customs];
}

export const WORKBENCH_DOC_INFO = {
  company: 'PARTICLE SCIENCE LTD',
  facility: 'BICESTER WORKBENCH CHECK-IN SHEET',
  subtitle: 'Component Cleanliness Process & Dispatch Quality Validation Log',
  formCode: 'PS-WORKBENCH-QA-2026',
  documentControlVersion: 'Version 2.4',
  iso14001: 'ISO 14001 Registered · Environmental Management',
  iso9001: 'ISO 9001 Registered · Quality Management',
  propertyNotice: 'Property of Particle Science Ltd',
};
