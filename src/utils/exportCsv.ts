import { ServiceUnit } from '../types/process';
import { getUnitDeliveryStatus } from './delivery';
import { getPriorityConfig } from './priority';

/**
 * Escapes a single CSV field value according to RFC 4180
 */
function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val).trim();
  // If value contains comma, quotes, or newlines, quote it and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats an ISO date string into readable YYYY-MM-DD HH:mm UTC/local
 */
function formatDate(iso?: string | null): string {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toISOString().replace('T', ' ').slice(0, 19);
  } catch {
    return iso;
  }
}

/**
 * Converts a list of ServiceUnits into an RFC 4180 compliant CSV string
 */
export function generateFleetCsv(units: ServiceUnit[]): string {
  const headers = [
    'Serial Number',
    'Work Order',
    'Customer / Racing Team',
    'Part Number',
    'Model Name',
    'Component Type',
    'Racing Category',
    'Racing Type / Program',
    'Chassis Number',
    'Car Allocation',
    'Team Tier',
    'Current Stage ID',
    'Current Stage Name',
    'Overall Status',
    'Priority',
    'Life Number',
    'Hours in Operation',
    'Assigned Technician',
    'Target Delivery Date',
    'Delivery SLA Status',
    'Is Overdue',
    'Is Archived',
    'Intake Date of Entry',
    'Created At',
    'Last Updated At',
    'Completed At',
    'Pressure Target (Bar)',
    'Test Pressure (Bar)',
    'Pressure Test Result',
    'Flow Test Status',
    'Flow Delta Pressure (Bar)',
    'Cleaning Cleanliness Spec',
    'Cleaning Lab Verdict',
    'QA Disposition',
    'QA Inspector',
  ];

  const rows = units.map((u) => {
    const delivery = getUnitDeliveryStatus(u);
    const priority = getPriorityConfig(u.priority);

    // Human readable stage label
    const stageLabels: Record<string, string> = {
      intake: 'Stage 01: Intake Sheet',
      degreasing: 'Stage 02: Degreasing & Oil Drain',
      descaling: 'Stage 03: Descaled Passages',
      first_flush: 'Stage 04: First Flush (55°C DI)',
      flow_test: 'Stage 05: Flow Testing (5-Pt)',
      pressure_test: 'Stage 06: Pressure Testing',
      cleaning: 'Stage 07: Ultra Fine RIG Cleaning',
      final_flush: 'Stage 08: Final Precision Flush',
      oven: 'Stage 09: Thermal Bakeout (2h)',
      gilling: 'Stage 10: Fin Straightening (Manual)',
      sign_off: 'Stage 11: QA Final Sign-Off',
    };

    // Component Type Label
    const compLabel = u.componentType === 'water_radiator'
      ? 'Water Radiator'
      : u.componentType === 'oil_cooler'
      ? 'Oil Cooler'
      : u.componentType === 'intercooler'
      ? 'Charge Air Cooler (Intercooler)'
      : u.componentType === 'combi_2_unit'
      ? 'Combi 2-in-1 Exchanger'
      : u.componentType === 'combi_3_unit'
      ? 'Combi 3-in-1 Exchanger'
      : 'Heat Exchanger';

    const values = [
      u.serialNumber || '',
      u.workOrderNumber || '',
      u.customerName || '',
      u.partNumber || '',
      u.modelName || '',
      compLabel,
      u.racingCategory || '',
      u.racingType || 'N/A',
      u.chassisNumber || 'N/A',
      u.carAllocation || 'N/A',
      u.teamTier || 'works',
      u.currentStepId || 'intake',
      stageLabels[u.currentStepId] || u.currentStepId,
      u.overallStatus || 'in_progress',
      priority.label || u.priority,
      u.lifeNumber ?? 1,
      u.intake?.hoursInOperation ?? 0,
      u.assignedTechnician || u.intake?.technician || u.signOff?.inspectorName || 'Unassigned',
      formatDate(u.delivery?.targetDeliveryDate || u.expectedDeliveryDate),
      delivery.status.toUpperCase(),
      delivery.isOverdue ? 'YES' : 'NO',
      u.isArchived ? 'YES' : 'NO',
      u.intake?.dateOfEntry || formatDate(u.createdAt),
      formatDate(u.createdAt),
      formatDate(u.updatedAt),
      formatDate(u.signOff?.completedAt) || (u.overallStatus === 'completed' ? formatDate(u.updatedAt) : 'N/A'),
      u.processConfig?.pressureTargetBar ?? u.pressureTest?.testPressureBar ?? 'N/A',
      u.pressureTest?.testPressureBar ?? 'N/A',
      u.pressureTest?.testResult ?? 'PENDING',
      u.flowTest?.isExempt ? 'EXEMPT' : (u.flowTest?.flowPass ? 'PASS' : (u.flowTest?.completedAt ? 'COMPLETED' : 'PENDING')),
      u.flowTest?.deltaPressureBar !== undefined ? `${u.flowTest.deltaPressureBar} Bar` : 'N/A',
      u.cleaning?.analysisResult?.particleCountIso || (u.cleaning?.cleaningSpecMicron ? `${u.cleaning.cleaningSpecMicron} µm` : 'N/A'),
      u.cleaning?.analysisResult?.verdict || (u.cleaning?.completedAt ? 'CONFORMING' : 'PENDING'),
      u.signOff?.qaDisposition || (u.overallStatus === 'completed' ? 'APPROVED' : 'PENDING'),
      u.signOff?.inspectorName || 'N/A',
    ];

    return values.map(escapeCsvValue).join(',');
  });

  return [headers.map(escapeCsvValue).join(','), ...rows].join('\r\n');
}

/**
 * Triggers a browser download of the fleet CSV file
 */
export function downloadFleetCsv(units: ServiceUnit[], teamOrDepotName?: string): void {
  const csvContent = generateFleetCsv(units);
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // Add UTF-8 BOM for Excel compatibility

  const sanitizedTeam = (teamOrDepotName || 'fleet')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `protrace-${sanitizedTeam}-units-${dateStr}.csv`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
